const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 100,
        trim: true
    },
    address: {
        type: String,
        required: true,
        maxlength: 255,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        maxlength: 100,
        unique: true,
        lowercase: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isActive: {
        type: Boolean,
        default: false   
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

storeSchema.index({ name: 1 });
storeSchema.index({ userId: 1 });
storeSchema.index({ status: 1 });

storeSchema.methods.toJSON = function () {
    return {
        id: this._id,
        name: this.name,
        address: this.address,
        phone: this.phone,
        email: this.email,
        isActive: this.isActive,
        status: this.status,
        userId: this.userId,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.model('Store', storeSchema);