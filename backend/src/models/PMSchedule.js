const mongoose = require('mongoose');

const PMScheduleSchema = new mongoose.Schema({
    asset_type: {
        type: String,
        required: [true, 'Asset Type is required (e.g. Server, Camera)'],
    },
    template_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PMTemplate',
        required: [true, 'PM Template is required'],
    },
    frequency: {
        type: String,
        enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'],
        required: true,
    },
    engineer_default: {
        type: String,
        trim: true,
    },
    start_date: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Paused', 'Discontinued'],
        default: 'Active',
    },
    branch: {
        type: String,
        default: 'Chennai',
    }
}, { timestamps: true });

// Ensure unique policy per asset type + template combo
PMScheduleSchema.index({ asset_type: 1, template_id: 1 }, { unique: true });

module.exports = { schema: PMScheduleSchema };
