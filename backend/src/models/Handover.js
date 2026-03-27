const mongoose = require('mongoose');

const handoverSchema = new mongoose.Schema({
    asset_id: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
    },
    recipient_type: {
        type: String,
        enum: ['IT', 'Other'],
        required: true,
    },
    recipient_name: {
        type: String,
        required: true,
        trim: true,
    },
    recipient_details: {
        type: String,
        trim: true,
    },
    photo_url: {
        type: String,
    },
    signature_url: {
        type: String,
    },
    handed_over_by: {
        type: String,
        required: true,
    },
    handover_date: {
        type: Date,
        default: Date.now,
    },
    branch: {
        type: String,
        required: true,
    }
}, { timestamps: true });

module.exports = { schema: handoverSchema };
