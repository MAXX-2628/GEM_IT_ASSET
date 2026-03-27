const mongoose = require('mongoose');

const StockTransactionSchema = new mongoose.Schema(
    {
        stock_item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StockItem',
            required: [true, 'Stock item reference is required'],
        },
        item_name: {
            // Denormalised for fast display without populate
            type: String,
            trim: true,
        },
        transaction_type: {
            type: String,
            enum: ['inward', 'outward'],
            required: [true, 'Transaction type is required'],
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
        },
        // --- Inward Fields ---
        vendor: { type: String, trim: true },
        invoice_number: { type: String, trim: true },
        // --- Outward Fields ---
        issued_to_dept: { type: String, trim: true },
        purpose: {
            type: String,
            enum: ['Replacement', 'New', 'Maintenance', 'Other', ''],
            default: '',
        },
        // --- Shared ---
        date: {
            type: Date,
            default: Date.now,
        },
        performed_by: {
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

StockTransactionSchema.index({ stock_item: 1 });
StockTransactionSchema.index({ transaction_type: 1 });
StockTransactionSchema.index({ date: -1 });
StockTransactionSchema.index({ issued_to_dept: 1 });

module.exports = { schema: StockTransactionSchema };
