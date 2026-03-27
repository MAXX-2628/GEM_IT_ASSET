const mongoose = require('mongoose');

const assetTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    code: {
        type: String,
        uppercase: true,
        trim: true,
    },
    icon: {
        type: String,
        default: 'Monitor', // Lucide icon name
    },
    description: {
        type: String,
        trim: true,
    },
    sub_categories: [{
        name: { type: String, required: true },
        code: { type: String, required: true, uppercase: true, trim: true }
    }],
    custom_fields: [{
        label: { type: String, required: true },
        key: { type: String, required: true },
        field_type: { type: String, default: 'text', enum: ['text', 'number', 'date', 'select', 'textarea', 'section'] },
        required: { type: Boolean, default: false },
        placeholder: { type: String },
        help_text: { type: String },
        options: [String],
        x: { type: Number, default: 0 },   // column start (0-11)
        y: { type: Number, default: 0 },   // row start
        w: { type: Number, default: 6 },   // column span (1-12)
        h: { type: Number, default: 1 },   // row span
        isSystem: { type: Boolean, default: false },
        locked: { type: Boolean, default: false },
        data_source: { type: String, default: 'static', enum: ['static', 'departments', 'asset_types', 'assets'] },
        data_source_config: {
            asset_type_id: { type: String }, // Used when data_source is 'assets'
        },
    }],
    sub_category_fields: [{
        sub_category_name: { type: String, required: true },
        fields: [{
            label: { type: String, required: true },
            key: { type: String, required: true },
            field_type: { type: String, default: 'text', enum: ['text', 'number', 'date', 'select', 'textarea', 'section'] },
            required: { type: Boolean, default: false },
            placeholder: { type: String },
            help_text: { type: String },
            options: [String],
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
            w: { type: Number, default: 6 },
            h: { type: Number, default: 1 },
            isSystem: { type: Boolean, default: false },
            locked: { type: Boolean, default: false },
            data_source: { type: String, default: 'static', enum: ['static', 'departments', 'asset_types', 'assets'] },
            data_source_config: {
                asset_type_id: { type: String },
            },
        }]
    }],
    active: {
        type: Boolean,
        default: true,
    },
    show_in_live: { type: Boolean, default: true },
    show_in_stock: { type: Boolean, default: true },
    show_in_scrap: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = { schema: assetTypeSchema };
