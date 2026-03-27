const express = require('express');
const router = express.Router();

/**
 * POST /api/agent/heartbeat
 * PC Agent sends system info every 5 minutes.
 * Upserts asset record by MAC address.
 * No auth required (agent uses internal network only).
 * Expects 'x-branch' or 'x-branch-code' header.
 */
router.post('/heartbeat', async (req, res) => {
    const { Asset } = req.models || {};

    if (!Asset) {
        return res.status(400).json({
            success: false,
            message: 'Branch identification required. Please provide x-branch header.'
        });
    }

    const { mac_address, hostname, ip_address, cpu, ram, os, storage, model, serial_number } = req.body;

    if (!mac_address) {
        return res.status(400).json({ success: false, message: 'mac_address is required.' });
    }

    const macUpper = mac_address.toUpperCase();

    const update = {
        hostname,
        ip_address,
        last_seen: new Date(),
        status: 'Active',
        'specs.cpu': cpu,
        'specs.ram': ram,
        'specs.os': os,
        'specs.storage': storage,
        'specs.model': model,
        'specs.serial_number': serial_number
    };

    // Try to find by MAC address and update
    const asset = await Asset.findOneAndUpdate(
        { mac_address: macUpper },
        { $set: update },
        { new: true }
    );

    if (!asset) {
        return res.status(200).json({
            success: true,
            message: 'Device not registered. Heartbeat received but not matched.',
            registered: false,
        });
    }

    res.status(200).json({ success: true, message: 'Heartbeat recorded.', registered: true, asset_id: asset.asset_id });
});

module.exports = router;
