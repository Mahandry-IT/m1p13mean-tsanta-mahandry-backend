const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

// GET /api/products/my-stores
const myStoresProductsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),

  // filtre boutique spécifique (optionnel)
  storeId: objectId.optional(),

  // recherche simple
  q: Joi.string().allow('').optional(),

  // tri
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'description').optional(),
  sortDir: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').optional(),
}).unknown(false);

module.exports = { myStoresProductsQuerySchema };

