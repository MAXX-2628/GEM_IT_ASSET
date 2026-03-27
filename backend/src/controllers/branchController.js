const db = require('../config/db');
const { getBranchConnection, getBranchModels } = require('../config/tenantManager');
const { seedBranchDefaults } = require('../services/seedService');

// @GET /api/branches
exports.getBranches = async (req, res) => {
    try {
        const { includeDeleted } = req.query;
        // Use $ne: true to include documents where isDeleted is false OR missing
        const filter = includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };

        // Priority: 1. Primary (isPrimary: true), 2. Custom Order, 3. Name
        const branches = await db.Branch.find(filter)
            .sort({ isPrimary: -1, order: 1, name: 1 });

        res.status(200).json({ success: true, count: branches.length, data: branches });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @POST /api/branches
exports.createBranch = async (req, res) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) return res.status(400).json({ success: false, message: 'Name and Code are required' });

        const count = await db.Branch.countDocuments();
        const branch = await db.Branch.create({ name, code, order: count });

        // Initialize and seed the new branch database
        const connection = await getBranchConnection(code.toUpperCase());
        const models = getBranchModels(connection);
        await seedBranchDefaults(models, name);

        res.status(201).json({ success: true, data: branch });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Branch Name or Code already exists' });
        }
        res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
    }
};

// @POST /api/branches/:id/primary
exports.setPrimary = async (req, res) => {
    try {
        const branch = await db.Branch.findById(req.params.id);
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
        if (branch.isDeleted) return res.status(400).json({ success: false, message: 'Cannot set a deleted branch as primary' });

        // Unset any existing primary
        await db.Branch.updateMany({ isPrimary: true }, { isPrimary: false });

        branch.isPrimary = true;
        await branch.save();

        res.status(200).json({ success: true, message: `${branch.name} is now the primary branch` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @PATCH /api/branches/reorder
exports.reorderBranches = async (req, res) => {
    try {
        const { orders } = req.body; // Array of { id, order }
        if (!orders || !Array.isArray(orders)) return res.status(400).json({ success: false, message: 'Orders array required' });

        const bulkOps = orders.map(item => ({
            updateOne: {
                filter: { _id: item.id },
                update: { order: item.order }
            }
        }));

        await db.Branch.bulkWrite(bulkOps);
        res.status(200).json({ success: true, message: 'Order updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @DELETE /api/branches/:id
exports.deleteBranch = async (req, res) => {
    try {
        const branch = await db.Branch.findById(req.params.id);
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

        if (branch.isPrimary) {
            const otherBranches = await db.Branch.countDocuments({ _id: { $ne: branch._id }, isDeleted: { $ne: true } });
            if (otherBranches > 0) {
                return res.status(400).json({ success: false, message: 'Cannot delete primary branch. Set another branch as primary first.' });
            }
        }

        // Soft delete logic
        branch.isDeleted = true;
        branch.deletedAt = new Date();
        branch.deletedBy = req.user.id;
        branch.restoreExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        branch.isPrimary = false; // Primary status removed on delete

        await branch.save();
        res.status(200).json({ success: true, message: 'Branch moved to recycle bin (7-day restore window)' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @POST /api/branches/:id/restore
exports.restoreBranch = async (req, res) => {
    try {
        const branch = await db.Branch.findById(req.params.id);
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
        if (!branch.isDeleted) return res.status(400).json({ success: false, message: 'Branch is not deleted' });

        branch.isDeleted = false;
        branch.restoredAt = new Date();
        branch.restoredBy = req.user.id;
        branch.deletedAt = undefined;
        branch.restoreExpiresAt = undefined;

        await branch.save();
        res.status(200).json({ success: true, message: 'Branch restored successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
