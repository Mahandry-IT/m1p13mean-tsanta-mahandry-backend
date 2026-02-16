const Joi = require('joi');

const registerSchema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string()
        .email({ tlds: { allow: false }, ignoreLength: true })
        .messages({ 'string.email': 'Email invalide, vérifiez le format (ex: nom@domaine.tld)' })
        .required(),
    password: Joi.string().min(6).max(128).required(),
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