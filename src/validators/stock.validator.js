const Joi = require('joi');

// Validation pour ajouter un mouvement de stock
const stockMovementSchema = Joi.object({
    isEntry: Joi.boolean().required()
        .messages({
            'any.required': 'Le type de mouvement (isEntry) est requis',
            'boolean.base': 'isEntry doit être true (entrée) ou false (sortie)'
        }),
    quantity: Joi.number().integer().min(1).required()
        .messages({
            'any.required': 'La quantité est requise',
            'number.base': 'La quantité doit être un nombre',
            'number.min': 'La quantité doit être au moins 1'
        }),
    name: Joi.string().max(100).required()
        .messages({
            'any.required': 'Le nom/motif du mouvement est requis',
            'string.max': 'Le nom ne doit pas dépasser 100 caractères'
        })
});

// Validation des IDs dans les params
const stockParamsSchema = Joi.object({
    productId: Joi.string().required()
        .messages({
            'any.required': 'L\'ID du produit est requis'
        }),
    storeId: Joi.string().hex().length(24).required()
        .messages({
            'any.required': 'L\'ID de la boutique est requis',
            'string.hex': 'ID de boutique invalide',
            'string.length': 'ID de boutique invalide'
        })
});

// Validation pour l'inventaire d'une boutique
const storeIdParamSchema = Joi.object({
    storeId: Joi.string().hex().length(24).required()
        .messages({
            'any.required': 'L\'ID de la boutique est requis',
            'string.hex': 'ID de boutique invalide',
            'string.length': 'ID de boutique invalide'
        })
});

module.exports = {
    stockMovementSchema,
    stockParamsSchema,
    storeIdParamSchema
};