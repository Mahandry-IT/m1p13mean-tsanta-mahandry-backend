const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const productCategorySchema = Joi.object({
  categoryId: objectId.required(),
  typeIds: Joi.array().items(objectId).default([]),
});

const imagesLinkSchema = Joi.array().items(Joi.object({ link: Joi.string().uri().required() }));

const createProductSchema = Joi.object({
  _id: Joi.string().optional(),
  name: Joi.string().max(50).required(),
  description: Joi.string().max(250).allow('').optional(),
  categories: Joi.array().items(productCategorySchema).default([]),
  storeData: Joi.array().default([]).optional(),
});

const updateProductSchema = Joi.object({
  name: Joi.string().max(50).optional(),
  description: Joi.string().max(250).allow('').optional(),
  categories: Joi.array().items(productCategorySchema).optional(),
}).min(1);

const idParamSchema = Joi.object({
  id: Joi.string().required(), // _id du produit est une string dans ce projet
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  q: Joi.string().allow('').optional(),
  sortBy: Joi.string().allow('').optional(),
  sortDir: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').optional(),
  categoryId: objectId.optional(),
  typeId: objectId.optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  idParamSchema,
  listQuerySchema,
};
