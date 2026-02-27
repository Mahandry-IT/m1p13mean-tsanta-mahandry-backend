const Joi = require('joi');

const objectIdSchema = Joi.string().hex().length(24);

const menuCreateSchema = Joi.object({
    label: Joi.string().max(50).required(),
    path: Joi.string().max(50).required(),
    permissions: Joi.object({
        roles: Joi.array().items(objectIdSchema).min(1).required()
    }).required(),
    icon: Joi.string().max(100).required(),
    order: Joi.number()
        .integer()
        .min(0)
        .custom((value, helpers) => {
            if (value % 10 !== 0) return helpers.error('any.invalid');
            return value;
        })
        .default(0)
        .messages({
            'any.invalid': 'order doit être un multiple de 10.'
        }),
    parentId: objectIdSchema.allow(null).default(null)
});

const menuUpdateSchema = Joi.object({
    label: Joi.string().max(50).optional(),
    path: Joi.string().max(50).optional(),
    permissions: Joi.object({
        roles: Joi.array().items(objectIdSchema).min(1).required()
    }).optional(),
    icon: Joi.string().max(100).optional(),
    order: Joi.number()
        .integer()
        .min(0)
        .custom((value, helpers) => {
            if (value % 10 !== 0) return helpers.error('any.invalid');
            return value;
        })
        .optional()
        .messages({
            'any.invalid': 'order doit être un multiple de 10.'
        }),
    parentId: objectIdSchema.allow(null).optional()
}).min(1);

const menuIdParamSchema = Joi.object({
    id: objectIdSchema.required()
});

const roleIdParamSchema = Joi.object({
    roleId: objectIdSchema.required()
});

const menuListQuerySchema = Joi.object({
    parentId: objectIdSchema.allow('null').optional(),
    roleId: objectIdSchema.optional()
});

const menuListByRoleQuerySchema = Joi.object({
    parentId: objectIdSchema.allow('null').optional()
});

module.exports = {
    menuCreateSchema,
    menuUpdateSchema,
    menuIdParamSchema,
    roleIdParamSchema,
    menuListQuerySchema,
    menuListByRoleQuerySchema
};
