const mongoose = require('mongoose');

const migrationSchema = new mongoose.Schema({
    version: {
        type: String,
        required: true,
        unique: true
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    error: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Migration', migrationSchema);