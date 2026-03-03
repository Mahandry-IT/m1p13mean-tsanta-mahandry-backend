const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createTypeSchema = Joi.object({
  categoryId: objectId.required(),
  name: Joi.string().max(50).required(),
  slug: Joi.string().max(80).optional(),
  isActive: Joi.boolean().optional(),
});

const updateTypeSchema = Joi.object({
  categoryId: objectId.optional(),
  name: Joi.string().max(50).optional(),
  slug: Joi.string().max(80).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const idParamSchema = Joi.object({
  id: objectId.required(),
});

module.exports = { createTypeSchema, updateTypeSchema, idParamSchema };

