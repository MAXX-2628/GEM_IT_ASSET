const db = require('../config/db');
const logger = require('../config/logger');

// @GET /api/users
exports.getUsers = async (req, res) => {
    try {
        const users = await db.User.find().select('-password');
        res.status(200).json({ success: true, data: users });
    } catch (err) {
        logger.error(`❌ Fetch Users Error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// @POST /api/users
exports.createUser = async (req, res) => {
    try {
        const { username, password, name, email, role, assignedBranches, allowedPages, hasFullAccess } = req.body;

        // Check if username/email exists
        const existing = await db.User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Username or Email already in use' });
        }

        const user = await db.User.create({
            username,
            password,
            name,
            email,
            role: role || 'viewer',
            assignedBranches: assignedBranches || [],
            allowedPages: allowedPages || [],
            hasFullAccess: hasFullAccess || false
        });

        res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            data: { id: user._id, username: user.username, role: user.role }
        });
    } catch (err) {
        logger.error(`❌ Create User Error: ${err.message}`);
        res.status(500).json({ success: false, message: err.message || 'Failed to create user' });
    }
};

// @PUT /api/users/:id
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role, assignedBranches, allowedPages, hasFullAccess, isActive } = req.body;
        
        const user = await db.User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent deactivating own account
        if (req.user._id.toString() === req.params.id && isActive === false) {
            return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.assignedBranches = assignedBranches || user.assignedBranches;
        user.allowedPages = allowedPages || user.allowedPages;
        user.hasFullAccess = hasFullAccess !== undefined ? hasFullAccess : user.hasFullAccess;
        user.isActive = isActive !== undefined ? isActive : user.isActive;

        await user.save();

        res.status(200).json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        logger.error(`❌ Update User Error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
};

// @DELETE /api/users/:id (Deactivate)
exports.deleteUser = async (req, res) => {
    try {
        if (req.user._id.toString() === req.params.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }

        const user = await db.User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User deactivated successfully' });
    } catch (err) {
        logger.error(`❌ Delete User Error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to deactivate user' });
    }
};

// @POST /api/users/:id/reset-password
exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }

        const user = await db.User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        logger.error(`❌ Reset Password Error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};

// @PUT /api/users/push-token
exports.updatePushToken = async (req, res) => {
    try {
        const { pushToken } = req.body;
        if (!pushToken) {
            return res.status(400).json({ success: false, message: 'Push token is required' });
        }

        const user = await db.User.findByIdAndUpdate(req.user._id, { expoPushToken: pushToken }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'Push token synchronized' });
    } catch (err) {
        logger.error(`❌ Push Token Sync Error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to sync push token' });
    }
};
