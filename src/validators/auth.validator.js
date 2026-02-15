const Joi = require('joi');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

const registerSchema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string()
        .email({ tlds: { allow: false }, ignoreLength: true })
        .messages({ 'string.email': 'Email invalide, vérifiez le format (ex: nom@domaine.tld)' })
        .required(),
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().min(2).max(100).required(),
    password: Joi.string().min(6).max(128).required(),
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
        .optional()
});

const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false }, ignoreLength: true })
        .messages({ 'string.email': 'Email invalide, vérifiez le format (ex: nom@domaine.tld)' })
        .required(),
    password: Joi.string().required()
});

const activationSchema = Joi.object({
    token: Joi.string().required()
});

const passwordResetSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false }, ignoreLength: true })
        .messages({ 'string.email': 'Email invalide, vérifiez le format (ex: nom@domaine.tld)' })
        .required()
});

const passwordChangeSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false }, ignoreLength: true })
        .messages({ 'string.email': 'Email invalide, vérifiez le format (ex: nom@domaine.tld)' })
        .required(),
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required()
});

module.exports = {
    registerSchema,
    loginSchema,
    activationSchema,
    passwordResetSchema,
    passwordChangeSchema
};