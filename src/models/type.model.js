const mongoose = require('mongoose');

function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

const typeSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

typeSchema.index({ categoryId: 1, slug: 1 }, { unique: true });
typeSchema.index({ name: 1 });

typeSchema.pre('validate', function (next) {
  if (!this.slug && this.name) this.slug = toSlug(this.name);
  next();
});

module.exports = mongoose.model('Type', typeSchema);

