/**
 * Pagination utilitaire (générique)
 *
 * Contrat:
 * - Input: { page, limit } (string|number|undefined)
 * - Output: { page, limit, skip } (numbers) + helpers
 */

function toInt(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getPagination(params = {}, options = {}) {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
  } = options;

  const rawPage = toInt(params.page);
  const rawLimit = toInt(params.limit);

  const page = clamp(rawPage || defaultPage, 1, Number.MAX_SAFE_INTEGER);
  const limit = clamp(rawLimit || defaultLimit, 1, maxLimit);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildPaginationMeta({ total, page, limit }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));

  return {
    total: safeTotal,
    page,
    limit,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

module.exports = { getPagination, buildPaginationMeta };

