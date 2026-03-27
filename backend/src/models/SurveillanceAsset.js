const mongoose = require('mongoose');

const SurveillanceAssetSchema = new mongoose.Schema(
    {
        branch: {
            type: String,
            default: 'Chennai',
            trim: true
        },
        asset_type: {
            type: String,
            default: 'Camera',
            required: true
        },
        location: {
            type: String,
            trim: true
        },
        ip_address: { type: String, trim: true },
        serial_number: { type: String, trim: true },
        nvr_connection: { type: String, trim: true },
        linked_nvr_id: { type: String, trim: true }, // Links to a live Asset (NVR)
        username: { type: String, trim: true },
        password: { type: String, trim: true },
        status: {
            type: String,
            default: 'Active',
            enum: ['Active', 'Faulty', 'Maintenance', 'Deactivated', 'Scrapped'],
        },
        notes: { type: String, trim: true },
        asset_id: { type: String, trim: true }, // Shared with IT Asset (asset_id)
    },
    { timestamps: true }
);

// Indexes
SurveillanceAssetSchema.index({ branch: 1, location: 1 });
SurveillanceAssetSchema.index({ ip_address: 1 });
SurveillanceAssetSchema.index({ serial_number: 1 });

module.exports = { schema: SurveillanceAssetSchema };
