const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    detailId: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    productStoreId: {
        type: mongoose.Schema.Types.ObjectId
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
    productName: {
        type: String,
        required: true,
        maxlength: 50
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: mongoose.Decimal128,
        required: true
    },
    totalPrice: {
        type: mongoose.Decimal128,
        required: true
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
        required: true
    },
    items: {
        type: [orderItemSchema],
        validate: [arrayMinLength, 'Order must have at least one item']
    },
    subtotal: {
        type: mongoose.Decimal128,
        required: true
    },
    tax: {
        type: mongoose.Decimal128,
        default: 0
    },
    total: {
        type: mongoose.Decimal128,
        required: true
    }
}, {
    timestamps: true
});

function arrayMinLength(val) {
    return val.length > 0;
}

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Méthode pour calculer les totaux
orderSchema.methods.calculateTotals = function() {
    this.subtotal = this.items.reduce((sum, item) => {
        return sum + parseFloat(item.totalPrice.toString());
    }, 0);

    this.tax = this.subtotal * 0.20; // 20% TVA exemple
    this.total = this.subtotal + this.tax;
};

// Hook pre-save pour calculer automatiquement
orderSchema.pre('save', function(next) {
    if (this.isModified('items')) {
        this.calculateTotals();
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);