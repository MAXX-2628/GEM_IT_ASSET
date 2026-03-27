const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        name: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ['super_admin', 'branch_admin', 'viewer'],
            default: 'viewer',
        },
        isActive: { type: Boolean, default: true },
        assignedBranches: [{ type: String }], // Array of branch codes e.g., ['CHN', 'MDU']
        allowedPages: [{ type: String }], // Array of page IDs e.g., ['dashboard', 'tickets']
        hasFullAccess: { type: Boolean, default: false }, // Access all branches
        lastLogin: { type: Date },
    },
    { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = { schema: UserSchema };
