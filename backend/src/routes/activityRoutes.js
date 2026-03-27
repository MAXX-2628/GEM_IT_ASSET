const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// @GET /api/activities — Fetch audit logs
router.get('/', verifyToken, async (req, res) => {
    const { ActivityLog } = req.models;
    const {
        startDate,
        endDate,
        module: logModule,
        page = 1,
        limit = 50,
        search
    } = req.query;

    const query = {};

    // Date filtering
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    if (logModule) query.module = logModule;
    if (search) {
        query.$or = [
            { user: new RegExp(search, 'i') },
            { target_id: new RegExp(search, 'i') },
            { action: new RegExp(search, 'i') },
            { details: new RegExp(search, 'i') }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
        ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        ActivityLog.countDocuments(query)
    ]);

    res.json({
        success: true,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: logs
    });
});

module.exports = router;
