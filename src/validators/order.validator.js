const Joi = require('joi');
const mongoose = require('mongoose');

const addToCartSchema = Joi.object({
    productId: Joi.string().required(),
    storeId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required()
});
const orderIdParamSchema = Joi.object({
    orderId: Joi.string().custom((value, helpers) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).required()
});

module.exports = {
    addToCartSchema,
    orderIdParamSchema
};