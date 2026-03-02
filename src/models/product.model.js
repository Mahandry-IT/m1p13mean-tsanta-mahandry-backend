const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    imageId: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    link: {
        type: String,
        required: true
    }
}, { _id: false });

const stockMovementSchema = new mongoose.Schema({
    movementId: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    isEntry: {
        type: Boolean,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    name: {
        type: String,
        maxlength: 50
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { _id: false });

const priceHistorySchema = new mongoose.Schema({
    price: {
        type: mongoose.Decimal128,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const promotionSchema = new mongoose.Schema({
    promotionId: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    discount: {
        type: mongoose.Decimal128,
        required: true
    },
    description: {
        type: String,
        maxlength: 50
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const storeDataSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    currentPrice: {
        type: mongoose.Decimal128,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    priceHistory: [priceHistorySchema],
    promotions: [promotionSchema],
    stockMovements: [stockMovementSchema]
}, { _id: false });

const productCategorySchema = new mongoose.Schema(
    {
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        typeIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Type'
        }]
    },
    { _id: false }
);

const productSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 50
    },
    description: {
        type: String,
        maxlength: 250
    },
    categories: {
        type: [productCategorySchema],
        default: []
    },
    images: [imageSchema],
    storeData: [storeDataSchema]
}, {
    timestamps: true
});

productSchema.index({ 'storeData.storeId': 1 });
productSchema.index({ 'categories.categoryId': 1 });
productSchema.index({ 'categories.typeIds': 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);