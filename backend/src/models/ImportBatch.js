const mongoose = require('mongoose');

const ImportBatchSchema = new mongoose.Schema({
    batch_id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    module: {
        type: String,
        required: true,
        enum: ['Assets', 'Surveillance', 'Communications', 'Licenses']
    },
    file_name: {
        type: String,
        required: true
    },
    file_size: {
        type: Number
    },
    total_records: {
        type: Number,
        default: 0
    },
    success_count: {
        type: Number,
        default: 0
    },
    failed_count: {
        type: Number,
        default: 0
    },
    warning_count: {
        type: Number,
        default: 0
    },
    skipped_count: {
        type: Number,
        default: 0
    },
    duplicate_mode: {
        type: String,
        enum: ['skip', 'update', 'stop'],
        default: 'skip'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'partial', 'failed'],
        default: 'pending'
    },
    imported_by: {
        type: String,
        required: true
    },
    branch: {
        type: String,
        required: true
    },
    errors: [{
        row: Number,
        field: String,
        error_type: {
            type: String,
            enum: ['Validation', 'Format', 'Duplicate', 'Business', 'System']
        },
        message: String,
        raw_data: mongoose.Schema.Types.Mixed
    }]
}, { timestamps: true });

// Index for fast search
ImportBatchSchema.index({ batch_id: 1 });
ImportBatchSchema.index({ branch: 1, createdAt: -1 });

module.exports = { schema: ImportBatchSchema };
