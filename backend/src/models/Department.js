const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Department name is required'],
            trim: true,
            unique: true,
        },
        code: {
            type: String,
            required: [true, 'Department code is required'],
            uppercase: true,
            trim: true,
            unique: true,
        },
        floor: { type: String, trim: true },
        description: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = { schema: DepartmentSchema };
