const mongoose = require('mongoose');
const logger = require('../utils/logger');

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
    },
    history: [{
        action: String,
        statusFrom: String,
        statusTo: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now }
    }],
    // ✅ Nouveau champ
    orderNumber: {
        type: String,
        unique: true
    }
}, {
    timestamps: true
});
orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        // Exemple de format : CMD-2026-0001
        const year = new Date().getFullYear();
        const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 chiffres aléatoires
        this.orderNumber = `CMD-${year}-${randomPart}`;
    }

    if (this.isModified('items')) {
        this.calculateTotals();
    }
    next();
});


function arrayMinLength(val) {
    return val.length > 0;
}

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Méthode pour calculer les totaux
orderSchema.methods.calculateTotals = function() {
  this.subtotal = mongoose.Types.Decimal128.fromString(
    this.items.reduce((sum, item) => sum + parseFloat(item.totalPrice.toString()), 0).toString()
  );

  const tax = parseFloat(this.subtotal.toString()) * 0.20;
  this.tax = mongoose.Types.Decimal128.fromString(tax.toString());

  const total = parseFloat(this.subtotal.toString()) + tax;
  this.total = mongoose.Types.Decimal128.fromString(total.toString());
};


// Hook pre-save pour calculer automatiquement
orderSchema.pre('save', function(next) {
    if (this.isModified('items')) {
        this.calculateTotals();
    }
    next();
});
orderSchema.methods.addHistory = function(action, from, to, userId) {
    logger.info("user id ve ? :" + userId);
  this.history.push({
    action,
    statusFrom: from,
    statusTo: to,
    by: new mongoose.Types.ObjectId(userId),
    at: new Date()
  });
};


module.exports = mongoose.model('Order', orderSchema);