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

const profileSchema = new mongoose.Schema({
  avatarUrl: {
      type: String,
      maxlength: 255,
      default: null,
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
      type: Date,
      required: true
  },
  phone: {
      type: String,
      maxlength: 50
  },
  gender: {
      type: String,
      enum: ['Homme', 'Femme', 'Non défini'],
      default: 'Non défini'
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
    profile: {
        type: profileSchema,
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'pending',
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

userSchema.methods.toJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    roleId: this.roleId,
    profile: {
        firstName: this.profile?.firstName,
        lastName: this.profile?.lastName,
        phone: this.profile?.phone || null,
        birthday: this.profile?.birthday || null,
        gender: this.profile?.gender || 'Non défini',
        avatarUrl: this.profile?.avatarUrl || null
    },
    status: this.status,
    lastLoginAt: this.lastLoginAt || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('User', userSchema);