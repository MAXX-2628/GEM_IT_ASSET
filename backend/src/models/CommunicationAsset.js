const mongoose = require('mongoose');

const CommunicationAssetSchema = new mongoose.Schema(
    {
        branch: {
            type: String,
            default: 'Chennai',
            trim: true
        },
        asset_type: {
            type: String,
            required: true,
            enum: ['CUG', 'Mail', 'Landline'],
        },
        // common fields
        department: { type: String, trim: true },
        assigned_user: { type: String, trim: true },
        status: {
            type: String,
            default: 'Active',
            enum: ['Active', 'Suspended', 'Deactivated', 'Expired', 'Expiring Soon'],
        },
        notes: { type: String, trim: true },

        // CUG specific fields
        mobile_number: { type: String, trim: true },
        sim_number: { type: String, trim: true },
        provider: { type: String, trim: true }, // e.g. Airtel, BSNL
        plan_name: { type: String, trim: true }, // e.g. 199 CUG
        monthly_cost: { type: Number },
        linked_asset_id: { type: String, trim: true }, // e.g. PC-01, MOB-01
        landline_number: { type: String, trim: true }, // Full external number

        // Mail specific fields
        email_id: { type: String, trim: true, lowercase: true },
        account_type: {
            type: String,
            enum: ['Individual', 'Shared', 'Departmental', 'System'],
            default: 'Individual'
        },
        platform: { type: String, trim: true, default: 'Outlook/O365' }, // e.g. O365, Gmail, Zimbra

        // Intercom specific (can be used for CUG or others)
        starnumber: { type: String, trim: true },

        // General password field
        password: { type: String, trim: true },
    },
    { timestamps: true }
);

// Indexes
CommunicationAssetSchema.index({ asset_type: 1 });
CommunicationAssetSchema.index({ mobile_number: 1 });
CommunicationAssetSchema.index({ starnumber: 1 });
CommunicationAssetSchema.index({ email_id: 1 });
CommunicationAssetSchema.index({ assigned_user: 1 });
CommunicationAssetSchema.index({ linked_asset_id: 1 });

module.exports = { schema: CommunicationAssetSchema };
