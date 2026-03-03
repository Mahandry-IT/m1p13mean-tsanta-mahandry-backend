const Joi = require('joi');

// Favori: un produit + une boutique
const favoriteAddSchema = Joi.object({
  productId: Joi.string().trim().required(),
  storeId: Joi.string().trim().required(),
});

const favoriteRemoveParamsSchema = Joi.object({
  favoriteId: Joi.string().trim().required(),
});

module.exports = { favoriteAddSchema, favoriteRemoveParamsSchema };

