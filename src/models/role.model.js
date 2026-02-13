const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
    featureId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 50
    },
    description: {
        type: String,
        maxlength: 50
    }
}, { _id: false });

const roleSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true,
        maxlength: 50
    },
    homepage: {
        type: String,
        maxlength: 100,
        required: true
    },
    features: [featureSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);