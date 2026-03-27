const mongoose = require('mongoose');

const PMRecordSchema = new mongoose.Schema({
    schedule_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PMSchedule',
        required: true,
    },
    asset_id: {
        type: String,
        required: true,
    },
    completed_date: {
        type: Date,
        default: Date.now,
    },
    engineer_name: {
        type: String,
        required: true,
    },
    checklist_results: [{
        task: String,
        status: { type: Boolean, default: false }
    }],
    remarks: {
        type: String,
    },
    attachments: [{
        name: String,
        url: String,
        file_type: String,
        uploaded_at: { type: Date, default: Date.now }
    }],
    branch: {
        type: String,
        default: 'Chennai',
    },
    all_passed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = { schema: PMRecordSchema };
