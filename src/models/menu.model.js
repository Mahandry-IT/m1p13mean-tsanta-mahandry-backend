const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
    {
        roles: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Role',
            required: true,
            default: [],
            validate: {
                validator: (value) => Array.isArray(value) && value.length > 0,
                message: 'permissions.roles doit contenir au moins un rôle.'
            }
        }
    },
    {
        _id: false
    }
);

const menuSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true
        },
        path: {
            type: String,
            required: true,
            unique: true,
            maxlength: 50,
            lowercase: true,
            trim: true,
            match: [/^[a-z0-9\-_/]*$/, 'path ne doit contenir que des lettres/chiffres et les caractères - _ /']
        },
        permissions: {
            type: permissionSchema,
            required: true
        },
        icon: {
            type: String,
            required: true,
            maxlength: 100,
            trim: true
        },
        order: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: (value) => value % 10 === 0,
                message: 'order doit être un multiple de 10.'
            }
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Menu',
            default: null,
            index: true
        }
    },
    {
        timestamps: true
    }
);

menuSchema.index({ 'permissions.roles': 1, parentId: 1, order: 1 });

menuSchema.index({ parentId: 1, order: 1 });

module.exports = mongoose.model('Menu', menuSchema);