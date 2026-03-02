const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

// DELETE /api/products/my-stores/:idp/:idb
const deleteMyStoreProductParamsSchema = Joi.object({
  idp: Joi.string().required(), // Product._id est une string dans ce projet
  idb: objectId.required(), // Store._id est un ObjectId
}).unknown(false);

module.exports = { deleteMyStoreProductParamsSchema };

