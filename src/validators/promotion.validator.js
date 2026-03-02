const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createPromotionSchema = Joi.object({
  productId: Joi.string().required(), // Product._id est string
  storeId: objectId.required(),
  discount: Joi.number().positive().required(),
  description: Joi.string().max(50).allow('').optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  isActive: Joi.boolean().optional(),
}).custom((v, helpers) => {
  if (v.startDate && v.endDate && new Date(v.endDate) <= new Date(v.startDate)) {
    return helpers.error('any.invalid');
  }
  return v;
}, 'date range validation');

const updatePromotionSchema = Joi.object({
  productId: Joi.string().required(),
  storeId: objectId.required(),
  discount: Joi.number().positive().optional(),
  description: Joi.string().max(50).allow('').optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  isActive: Joi.boolean().optional(),
}).min(3); // inclut productId+storeId + au moins 1 champ

const removePromotionSchema = Joi.object({
  productId: Joi.string().required(),
  storeId: objectId.required(),
});

const promotionIdParamSchema = Joi.object({
  promotionId: objectId.required(),
});

const listPromotionsQuerySchema = Joi.object({
  productId: Joi.string().required(),
  storeId: objectId.optional(),
  isActive: Joi.boolean().optional(),
});

const getPromotionQuerySchema = Joi.object({
  productId: Joi.string().required(),
  storeId: objectId.required(),
});

const suggestPromotionQuerySchema = Joi.object({
  storeId: objectId.required(),
});

const listPromotionsByStoreQuerySchema = Joi.object({
  storeId: objectId.required(),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  createPromotionSchema,
  updatePromotionSchema,
  removePromotionSchema,
  promotionIdParamSchema,
  listPromotionsQuerySchema,
  getPromotionQuerySchema,
  suggestPromotionQuerySchema,
  listPromotionsByStoreQuerySchema,
};
