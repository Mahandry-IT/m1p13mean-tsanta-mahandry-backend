const mongoose = require('mongoose');

const passwordHistorySchema = new mongoose.Schema({
    passwordHash: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    token: {
        type: String,
        required: true
    },
    expiredAt: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const favoriteSchema = new mongoose.Schema({
    favoriteId: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    productId: {
        type: String,
        ref: 'Product',
        required: true
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        maxlength: 50,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        maxlength: 50,
        lowercase: true,
        trim: true
    },
    firstName: {
        type: String,
        required: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: true,
        maxlength: 50
    },
    birthday: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'pending',
        maxlength: 50
    },
    phone: {
        type: String,
        maxlength: 50
    },
    failedAttempts: {
        type: Number,
        default: 0
    },
    lastLoginAt: {
        type: Date
    },
    roleId: {
        type: String,
        ref: 'Role',
        required: true
    },
    passwordHistory: [passwordHistorySchema],
    sessions: [sessionSchema],
    favorites: [favoriteSchema]
}, {
    timestamps: true
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ roleId: 1 });

module.exports = mongoose.model('User', userSchema);