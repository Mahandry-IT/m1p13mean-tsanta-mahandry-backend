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
  description: Joi.string().max(50).allow('').optional(),
  categories: Joi.array().items(productCategorySchema).default([]),
  // En multipart/form-data, ce champ peut être absent (fichiers dans req.files)
  images: Joi.alternatives().try(
    imagesLinkSchema,
    Joi.string().custom((value, helpers) => {
      try {
        const parsed = JSON.parse(value);
        const { error } = imagesLinkSchema.validate(parsed);
        if (error) return helpers.error('any.invalid');
        return parsed;
      } catch {
        return helpers.error('any.invalid');
      }
    }, 'Parse images JSON')
  ).optional(),
  storeData: Joi.array().default([]),
});

const updateProductSchema = Joi.object({
  name: Joi.string().max(50).optional(),
  description: Joi.string().max(50).allow('').optional(),
  categories: Joi.array().items(productCategorySchema).optional(),
  images: Joi.alternatives().try(
    imagesLinkSchema,
    Joi.string().custom((value, helpers) => {
      try {
        const parsed = JSON.parse(value);
        const { error } = imagesLinkSchema.validate(parsed);
        if (error) return helpers.error('any.invalid');
        return parsed;
      } catch {
        return helpers.error('any.invalid');
      }
    }, 'Parse images JSON')
  ).optional(),
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
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  idParamSchema,
  listQuerySchema,
};
