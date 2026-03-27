const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    color: {
        type: String,
        default: 'default', // success, danger, warning, purple, info, default
    },
    description: {
        type: String,
        trim: true,
    },
    active: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

module.exports = { schema: statusSchema };
