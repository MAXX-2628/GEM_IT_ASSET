const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    file_type: { type: String, default: 'other' },
    url: { type: String, required: true },
    uploaded_at: { type: Date, default: Date.now },
});

const MovementHistorySchema = new mongoose.Schema({
    from_department: { type: String },
    to_department: { type: String },
    from_user: { type: String },
    to_user: { type: String },
    from_location: { type: String },
    to_location: { type: String },
    moved_by: { type: String, required: true },
    moved_date: { type: Date, default: Date.now },
    action_type: { type: String, trim: true }, // Deploy, Transfer, Scrap, Edit
    notes: { type: String },
});

const AssetSchema = new mongoose.Schema(
    {
        branch: {
            type: String,
            default: 'Chennai',
            trim: true
        },
        asset_id: {
            type: String,
            required: [true, 'Asset ID is required'],
            uppercase: true,
            trim: true,
            // Format: CODE-XXXX (e.g., SRV-0001, NVR-0002) - Per-type numeric sequence with type code prefix
        },
        asset_type: {
            type: String,
            required: [true, 'Asset type is required'],
            trim: true,
        },
        hostname: { type: String, trim: true },
        mac_address: {
            type: String,
            uppercase: true,
            trim: true,
            // Used as a primary hardware identifier (now optional)
        },
        ip_address: { type: String, trim: true },
        department: {
            type: String,
            default: 'IT STOCK',
            trim: true,
        },
        location: { type: String, trim: true }, // physical location within dept
        assigned_user: { type: String, trim: true },
        sub_category: { type: String, trim: true },
        status: {
            type: String,
            default: 'In Stock',
            trim: true,
        },
        specs: {
            cpu: { type: String },
            ram: { type: String },
            storage: { type: String },
            storage_type: { type: String },
            os: { type: String },
            model: { type: String },
            serial_number: { type: String },
            custom: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
        amc: {
            vendor: { type: String },
            start_date: { type: Date },
            end_date: { type: Date },
            contact: { type: String },
            contract_number: { type: String },
        },
        warranty_end: { type: Date },
        purchase_date: { type: Date },
        purchase_cost: { type: Number },
        vendor: { type: String },
        attachments: [AttachmentSchema],
        movement_history: [MovementHistorySchema],
        qr_code_url: { type: String },
        last_seen: { type: Date },
        notes: { type: String },
        parent_asset_id: { type: String, trim: true }, // For peripherals linked to a main asset
        credentials: {
            type: [{
                label: { type: String, trim: true }, // e.g., "Web GUI", "Root", "SSH"
                username: { type: String, trim: true },
                password: { type: String, trim: true },
            }],
            select: false
        },
        batch_id: { type: String, index: true }, // Tracking for import source
    },
    { timestamps: true }
);

// Pre-save hook for normalization
AssetSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status) {
        // Normalize to Title Case (e.g., "in stock" -> "In Stock", "active" -> "Active")
        this.status = this.status
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    next();
});

// Indexes for fast queries
AssetSchema.index({ asset_type: 1, asset_id: 1 }, { unique: true }); // Per-type unique ID
AssetSchema.index({ asset_id: 1 });
AssetSchema.index({ mac_address: 1 });
AssetSchema.index({ department: 1 });
AssetSchema.index({ status: 1 });
AssetSchema.index({ parent_asset_id: 1 });
AssetSchema.index({ warranty_end: 1 });
AssetSchema.index({ 'amc.end_date': 1 });
AssetSchema.index({ hostname: 'text', asset_id: 'text', department: 'text' });

module.exports = { schema: AssetSchema };
