const mongoose = require('mongoose');

const PMTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Template name is required'],
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    checklist: [{
        task: { type: String, required: true },
        description: { type: String },
    }],
    active: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

module.exports = { schema: PMTemplateSchema };
