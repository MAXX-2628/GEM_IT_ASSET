const mongoose = require('mongoose');

const StockItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
        },
        unit: {
            type: String,
            default: 'Pcs',
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        min_stock_level: {
            type: Number,
            default: 5,
            min: 0,
        },
        total_quantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        vendor: {
            type: String,
            trim: true,
        },
        location: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

// Virtual field: derived stock status based on quantity vs min level
StockItemSchema.virtual('stock_status').get(function () {
    if (this.total_quantity === 0) return 'Critical';
    if (this.total_quantity <= this.min_stock_level) return 'Low';
    return 'In Stock';
});

StockItemSchema.set('toJSON', { virtuals: true });
StockItemSchema.set('toObject', { virtuals: true });

StockItemSchema.index({ name: 'text', category: 'text', vendor: 'text' });
StockItemSchema.index({ total_quantity: 1 });
StockItemSchema.index({ category: 1 });

module.exports = { schema: StockItemSchema };
