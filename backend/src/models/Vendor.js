const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vendor name is required'],
            trim: true,
            unique: true,
        },
        vendor_type: {
            type: String,
            required: true,
            enum: ['Normal', 'AMC', 'Both'],
            default: 'Normal'
        },
        contact_person: { type: String, trim: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        address: { type: String, trim: true },
        description: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = { schema: VendorSchema };
