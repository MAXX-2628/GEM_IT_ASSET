const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
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

module.exports = { schema: floorSchema };
