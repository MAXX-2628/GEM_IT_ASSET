const mongoose = require('mongoose');

const SoftwareLicenseSchema = new mongoose.Schema(
    {
        branch: {
            type: String,
            default: 'Chennai',
            trim: true
        },
        software_name: {
            type: String,
            required: [true, 'Software name is required'],
            trim: true,
        },
        vendor: { type: String, trim: true },
        license_key: { type: String, trim: true },
        license_type: {
            type: String,
            enum: ['OEM', 'Perpetual', 'Subscription', 'Open Source', 'Trial'],
            default: 'Perpetual',
        },
        seats_purchased: { type: Number, default: 1 },
        seats_used: { type: Number, default: 0 },
        purchase_date: { type: Date },
        expiry_date: { type: Date },
        cost: { type: Number },
        assigned_assets: [{ type: String }], // array of asset_ids
        department: { type: String },
        notes: { type: String },
        status: {
            type: String,
            enum: ['Active', 'Expired', 'Expiring Soon', 'Suspended', 'Deactivated'],
            default: 'Active',
        },
    },
    { timestamps: true }
);

SoftwareLicenseSchema.index({ expiry_date: 1 });
SoftwareLicenseSchema.index({ software_name: 'text' });

module.exports = { schema: SoftwareLicenseSchema };
