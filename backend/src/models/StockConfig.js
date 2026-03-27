const mongoose = require('mongoose');

const StockConfigSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: [true, 'Config type is required'],
            enum: ['Category', 'Unit', 'Location', 'Purpose'],
            index: true
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Ensure that a name is unique within a specific configuration type
StockConfigSchema.index({ type: 1, name: 1 }, { unique: true });

module.exports = { schema: StockConfigSchema };
