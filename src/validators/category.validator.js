const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createCategorySchema = Joi.object({
  name: Joi.string().max(50).required(),
  slug: Joi.string().max(80).optional(),
  description: Joi.string().max(200).allow('').optional(),
  isActive: Joi.boolean().optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().max(50).optional(),
  slug: Joi.string().max(80).optional(),
  description: Joi.string().max(200).allow('').optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const idParamSchema = Joi.object({
  id: objectId.required(),
});

module.exports = { createCategorySchema, updateCategorySchema, idParamSchema };

