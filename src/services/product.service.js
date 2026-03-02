const mongoose = require('mongoose');
const Product = require('../models/product.model');
const { upload } = require('../utils/upload');

function escRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function list() {
  return Product.find({}, { _id: 1, name: 1 }).lean(false);
}

/**
 * Listing paginé avec recherche multi-champs.
 * - Recherche sur Product.name, Product.description
 * - Recherche sur catégories et types via lookup sur collections Category / Type.
 */
async function listPaginated(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const q = (filters.q || '').toString().trim();
  const hasQ = Boolean(q);

  const match = {};

  // filtres directs (optionnels)
  if (filters.productId) match._id = String(filters.productId);

  // Filtres categories/types
  // NOTE: dans Product, categories.categoryId et categories.typeIds sont des ObjectId
  const hasCategoryId = Boolean(filters.categoryId);
  const hasTypeId = Boolean(filters.typeId);

  let categoryObjectId;
  let typeObjectId;

  if (hasCategoryId) {
    if (!mongoose.Types.ObjectId.isValid(String(filters.categoryId))) {
      const err = new Error('categoryId invalide');
      err.status = 400;
      throw err;
    }
    categoryObjectId = new mongoose.Types.ObjectId(String(filters.categoryId));
  }

  if (hasTypeId) {
    if (!mongoose.Types.ObjectId.isValid(String(filters.typeId))) {
      const err = new Error('typeId invalide');
      err.status = 400;
      throw err;
    }
    typeObjectId = new mongoose.Types.ObjectId(String(filters.typeId));
  }

  if (hasCategoryId && hasTypeId) {
    match.categories = { $elemMatch: { categoryId: categoryObjectId, typeIds: typeObjectId } };
  } else if (hasCategoryId) {
    match['categories.categoryId'] = categoryObjectId;
  } else if (hasTypeId) {
    match['categories.typeIds'] = typeObjectId;
  }

  // pipeline aggregation pour permettre la recherche sur Category/Type
  const pipeline = [
    { $match: match },

   {
      $lookup: {
        from: 'categories',
        localField: 'categories.categoryId',
        foreignField: '_id',
        as: '_categories',
      },
    },

    // Join Type
    {
      $lookup: {
        from: 'types',
        localField: 'categories.typeIds',
        foreignField: '_id',
        as: '_types',
      },
    },
  ];

  if (hasQ) {
    const re = new RegExp(escRegex(q), 'i');
    pipeline.push({
      $match: {
        $or: [
          { name: re },
          { description: re },
          { '_categories.name': re },
          { '_categories.slug': re },
          { '_types.name': re },
          { '_types.slug': re },
        ],
      },
    });
  }

  // Sort (optionnel)
  const allowedSortBy = new Set(['createdAt', 'updatedAt', 'name', 'description']);
  const requestedSortBy = (filters.sortBy || 'createdAt').toString();
  const sortBy = allowedSortBy.has(requestedSortBy) ? requestedSortBy : 'createdAt';

  const sortDirRaw = String(filters.sortDir || 'desc').toLowerCase();
  const sortDir = sortDirRaw === 'asc' ? 1 : -1;

  // Tri secondaire sur _id pour stabiliser l'ordre quand les valeurs sont identiques
  pipeline.push({ $sort: { [sortBy]: sortDir, _id: 1 } });

  pipeline.push({
    $facet: {
      data: [
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _categories: 0,
            _types: 0,
          },
        },
      ],
      meta: [{ $count: 'total' }],
    },
  });

  const agg = await Product.aggregate(pipeline);
  const data = agg?.[0]?.data || [];
  const total = agg?.[0]?.meta?.[0]?.total || 0;

  return {
    products: data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasPrev: page > 1,
      hasNext: page * limit < total,
    },
  };
}

async function getById(id) {
  return Product.findById(id);
}

async function uploadProductImages(files = []) {
  const arr = Array.isArray(files) ? files : [];
  if (arr.length === 0) return [];

  // upload en parallèle (attention: peut être lourd si beaucoup de fichiers)
  const results = await Promise.all(
    arr
      .filter((f) => f && f.buffer)
      .map((file) => upload({ folder: 'samples/products', resource_type: 'image', file }))
  );

  return results.map((r) => ({
    imageId: new mongoose.Types.ObjectId(),
    link: r.secure_url,
  }));
}

async function create(payload, files = []) {
  // Le schema Product impose _id string -> si absent, on en génère un ObjectId string
  const data = { ...payload };
  if (!data._id) data._id = new mongoose.Types.ObjectId().toString();

  const uploadedImages = await uploadProductImages(files);

  // Si le body contient déjà images (liens) on les garde, et on ajoute les upload
  data.images = Array.isArray(data.images) ? data.images : [];
  data.images = [
    ...data.images.map((img) => ({ ...img, imageId: new mongoose.Types.ObjectId() })),
    ...uploadedImages,
  ];

  const doc = await Product.create(data);
  return doc;
}

async function update(id, payload, files = []) {
  const uploadedImages = await uploadProductImages(files);

  const data = { ...payload };

  if (uploadedImages.length) {
    // Si images est fourni dans le body, on considère que ça remplace, puis on append les nouvelles
    // Sinon on append aux images existantes
    if (Array.isArray(data.images)) {
      data.images = [
        ...data.images.map((img) => ({ ...img, imageId: new mongoose.Types.ObjectId() })),
        ...uploadedImages,
      ];
    } else {
      const existing = await Product.findById(id).select('images');
      if (!existing) return null;
      data.images = [
        ...(existing.images || []).map((img) => ({ ...img, imageId: new mongoose.Types.ObjectId() })),
        ...uploadedImages,
      ];
    }
  }

  const doc = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return doc;
}

async function remove(id) {
  const doc = await Product.findByIdAndDelete(id);
  return doc;
}

async function removeStoreData(productId, storeId) {
  if (!productId) {
    const err = new Error('productId manquant');
    err.status = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(String(storeId))) {
    const err = new Error('storeId invalide');
    err.status = 400;
    throw err;
  }

  const storeObjId = new mongoose.Types.ObjectId(String(storeId));

  const doc = await Product.findByIdAndUpdate(
    productId,
    { $pull: { storeData: { storeId: storeObjId } } },
    { new: true }
  );

  return doc;
}

module.exports = {
  listPaginated,
  list,
  getById,
  create,
  update,
  remove,
  removeStoreData,
};
