const Joi = require('joi');
const parsePhoneNumberFromString = require("libphonenumber-js");

const userUpdateSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    roles: Joi.array().items(Joi.string()).optional()
}).min(1);

const userIdParamSchema = Joi.object({
    id: Joi.string().hex().length(24).required()
});

const userCreatedProfileSchema = Joi.object({
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().min(2).max(100).required(),
    phone: Joi.string()
        .custom((value, helpers) => {
            if (!value) return value;
            const phone = parsePhoneNumberFromString(value);
            if (!phone || !phone.isValid()) {
                return helpers.error('any.invalid');
            }
            // retourne le format E.164 normalisé
            return phone.number;
        }, 'Validation téléphone internationale')
        .messages({ 'any.invalid': 'Numéro de téléphone invalide, utilisez un format international (ex: +261 33 12 345 67)' })
        .required(),
    birthday: Joi.date().iso().required(),
    gender: Joi.string().valid('Homme', 'Femme', 'Non défini').required()
});

const checkProfileSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false }, ignoreLength: true })
        .messages({ 'string.email': 'Email invalide, vérifiez le format (ex: nom@domaine.tld)' })
        .required()
});

module.exports = {
    userUpdateSchema,
    userIdParamSchema,
    checkProfileSchema,
    userCreatedProfileSchema
};
