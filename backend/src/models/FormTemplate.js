const mongoose = require('mongoose');

const formTemplateSchema = new mongoose.Schema({
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
    fields: [{
        label: { type: String, required: true },
        key: { type: String, required: true },
        field_type: { type: String, default: 'text', enum: ['text', 'number', 'date', 'select', 'textarea'] },
        required: { type: Boolean, default: false },
        placeholder: { type: String },
        options: [String],
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        w: { type: Number, default: 6 },
        h: { type: Number, default: 1 },
    }],
}, { timestamps: true });

module.exports = mongoose.model('FormTemplate', formTemplateSchema);
