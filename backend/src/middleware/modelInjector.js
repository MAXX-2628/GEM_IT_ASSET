const { getBranchConnection, getBranchModels } = require('../config/tenantManager');
const logger = require('../config/logger');
const db = require('../config/db');

/**
 * Middleware to inject branch-specific models into the request
 */
const modelInjector = async (req, res, next) => {
    try {
        req.models = {}; // Initialize to prevent destructuring errors
        const branchCode = req.headers['x-branch-code'] || req.headers['x-branch'];

        if (!branchCode) {
            return next();
        }

        // Resolve branch from master DB to ensure we have both code and name correctly
        const branchDoc = await db.Branch.findOne({
            $or: [
                { code: branchCode.toUpperCase() },
                { name: new RegExp(`^${branchCode}$`, 'i') }
            ]
        });

        if (!branchDoc) {
            logger.warn(`⚠️ Unknown branch requested: ${branchCode}`);
            req.models = {}; // Prevent destructuring crash
            return next();
        }

        const connection = await getBranchConnection(branchDoc.code);
        req.models = getBranchModels(connection);
        req.branchCode = branchDoc.code;
        req.branchName = branchDoc.name;
        req.branch = branchDoc.name; // For backward compatibility
        next();
    } catch (err) {
        logger.error(`❌ Model Injection Error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Database connection error for selected branch.'
        });
    }
};

module.exports = modelInjector;
