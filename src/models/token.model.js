const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['password_reset', 'activation'],
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiredAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

tokenSchema.index({ userId: 1, type: 1, isActive: 1, expiredAt: 1 });

module.exports = mongoose.model('Token', tokenSchema);
