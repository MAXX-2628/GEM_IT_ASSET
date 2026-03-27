const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Sign JWT token helper
const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// @POST /api/auth/login
exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const user = await db.User.findOne({ username }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    res.status(200).json({
        success: true,
        token,
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedBranches: user.assignedBranches,
            hasFullAccess: user.hasFullAccess,
            canAccessAllBranches: user.role === 'super_admin' || user.hasFullAccess
        },
    });
};

// @GET /api/auth/me
exports.getMe = async (req, res) => {
    res.status(200).json({ success: true, user: req.user });
};

// @POST /api/auth/logout
exports.logout = (req, res) => {
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// @POST /api/auth/change-password
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await db.User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully.' });
};

// @POST /api/auth/setup  (First time admin setup - only if no users exist)
exports.setup = async (req, res) => {
    const count = await db.User.countDocuments();
    if (count > 0) {
        return res.status(403).json({ success: false, message: 'Admin already exists. Setup not allowed.' });
    }

    const { username, password, name, email } = req.body;
    const user = await db.User.create({ username, password, name, email, role: 'super_admin' });
    const token = signToken(user._id);

    res.status(201).json({
        success: true,
        message: 'Admin account created.',
        token,
        user: { id: user._id, username: user.username, name: user.name, email: user.email },
    });
};
