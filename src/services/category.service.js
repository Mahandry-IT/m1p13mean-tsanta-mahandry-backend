const Category = require('../models/category.model');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

async function create(payload) {
  const doc = await Category.create(payload);
  return doc;
}

async function getById(id) {
  const doc = await Category.findById(id);
  return doc;
}

async function list() {
  return Category.find({}, { _id: 1, name: 1 }).lean(false);
}

async function listAll(filters = {}) {
  const { page, limit, skip } = getPagination(filters, {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  });

  const query = {};

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

  const [categories, total] = await Promise.all([
    Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Category.countDocuments(query),
  ]);

  return {
    categories,
    pagination: buildPaginationMeta({ total, page, limit }),
  };
}

async function update(id, payload) {
  const doc = await Category.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return doc;
}

async function remove(id) {
  const doc = await Category.findByIdAndDelete(id);
  return doc;
}

module.exports = { create, getById, list, listAll, update, remove };

