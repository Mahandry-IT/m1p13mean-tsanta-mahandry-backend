const Joi = require('joi');
const parsePhoneNumber = require('libphonenumber-js');

// Validation pour la demande de création de boutique
const storeRequestSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    address: Joi.string().min(5).max(255).required(),
    phone: Joi.string()
        .custom((value, helpers) => {
            const phone = parsePhoneNumber(value);
            if (!phone || !phone.isValid()) {
                return helpers.error('any.invalid');
            }
            return phone.number;
        }, 'Validation téléphone')
        .messages({
            'any.invalid': 'Numéro de téléphone invalide, utilisez le format international (ex: +261 33 12 345 67)'
        })
        .required(),
    email: Joi.string().email().max(100).required()
});

// Validation de l'id dans les params
const storeIdParamSchema = Joi.object({
    id: Joi.string().hex().length(24).required()
});

// Validation pour les filtres de liste (query params)
const storeListQuerySchema = Joi.object({
    status: Joi.string().valid('pending', 'active', 'inactive', 'rejected').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
    storeRequestSchema,
    storeIdParamSchema,
    storeListQuerySchema
};