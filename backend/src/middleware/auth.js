const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer ')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Token invalid. User not found.' });
        }

        // Add special property to handle super_admin and hasFullAccess
        user.canAccessAllBranches = user.role === 'super_admin' || user.hasFullAccess;

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};

/**
 * Middleware to restrict access based on roles
 * @param {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: `Access denied. ${roles.join(' or ')} role required.` });
        }
        next();
    };
};

/**
 * Middleware to validate branch access
 */
const requireBranchAccess = (req, res, next) => {
    const branchCode = req.headers['x-branch-code'];
    
    if (!branchCode) {
        return res.status(400).json({ success: false, message: 'Branch code is required in headers.' });
    }

    if (req.user.canAccessAllBranches) {
        return next();
    }

    if (!req.user.assignedBranches || !req.user.assignedBranches.includes(branchCode)) {
        return res.status(403).json({ success: false, message: `Access denied. You do not have permission for branch ${branchCode}.` });
    }

    next();
};

module.exports = { verifyToken, requireRole, requireBranchAccess };
