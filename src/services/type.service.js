const Type = require('../models/type.model');
const Category = require('../models/category.model');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

async function create(payload) {
  const categoryExists = await Category.exists({ _id: payload.categoryId });
  if (!categoryExists) {
    const err = new Error('Catégorie introuvable');
    err.status = 404;
    throw err;
  }

  const doc = await Type.create(payload);
  return doc;
}

async function getById(id) {
  const doc = await Type.findById(id);
  return doc;
}

async function list(filters = {}) {
  const { page, limit, skip } = getPagination(filters, {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  });

  const query = {};

  if (filters.categoryId) {
    query.categoryId = filters.categoryId;
  }

  if (filters.isActive !== undefined) {
    query.isActive = String(filters.isActive) === 'true';
  }

  if (filters.q) {
    const q = String(filters.q).trim();
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
      ];
    }
  }

  const [types, total] = await Promise.all([
    Type.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Type.countDocuments(query),
  ]);

  return {
    types,
    pagination: buildPaginationMeta({ total, page, limit }),
  };
}

async function update(id, payload) {
  if (payload.categoryId) {
    const categoryExists = await Category.exists({ _id: payload.categoryId });
    if (!categoryExists) {
      const err = new Error('Catégorie introuvable');
      err.status = 404;
      throw err;
    }
  }

  const doc = await Type.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return doc;
}

async function remove(id) {
  const doc = await Type.findByIdAndDelete(id);
  return doc;
}

async function listByCategory(categoryId, filters = {}) {
  return list({ ...filters, categoryId });
}

module.exports = { create, getById, list, update, remove, listByCategory };

