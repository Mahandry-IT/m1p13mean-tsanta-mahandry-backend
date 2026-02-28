const Role = require('../models/role.model');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

async function list() {
  return Role.find({}, { _id: 1, value: 1 }).lean(false);
}

async function listPaginated(filters = {}) {
  const { page, limit, skip } = getPagination(filters, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });

  const query = {};

  // Optionnel: recherche simple sur value/homepage
  if (filters.q) {
    const q = String(filters.q).trim();
    if (q) {
      query.$or = [
        { value: { $regex: q, $options: 'i' } },
        { homepage: { $regex: q, $options: 'i' } },
      ];
    }
  }

  const [roles, total] = await Promise.all([
    Role.find(query, { _id: 1, value: 1 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(false),
    Role.countDocuments(query)
  ]);

  return {
    roles,
    pagination: buildPaginationMeta({ total, page, limit })
  };
}

module.exports = { list, listPaginated };

