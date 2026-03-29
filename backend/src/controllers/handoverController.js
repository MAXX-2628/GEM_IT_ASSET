const logActivity = require('../utils/activityLogger');
const notificationService = require('../services/notificationService');
const db = require('../config/db');

// @GET /api/handovers — List all handovers
exports.getHandovers = async (req, res) => {
    const { Handover } = req.models;
    const { search, page = 1, limit = 20, startDate, endDate } = req.query;

    const query = {};

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    if (search) {
        query.$or = [
            { asset_id: new RegExp(search, 'i') },
            { recipient_name: new RegExp(search, 'i') }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [handovers, total] = await Promise.all([
        Handover.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        Handover.countDocuments(query),
    ]);

    res.status(200).json({
        success: true,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: handovers,
    });
};

// @GET /api/handovers/asset/:id — Get latest handover for an asset
exports.getAssetHandover = async (req, res) => {
    const { Handover } = req.models;
    const handover = await Handover.findOne({ asset_id: req.params.id.toUpperCase() }).sort({ createdAt: -1 });

    if (!handover) return res.status(404).json({ success: false, message: 'No handover found for this asset.' });
    res.status(200).json({ success: true, data: handover });
};

// @POST /api/handovers — Create handover record
exports.createHandover = async (req, res) => {
    const { Handover, Asset } = req.models;

    // Parse JSON data from FormData string if it exists, else use body
    const handoverData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

    // Add branch from request
    handoverData.branch = req.branch || 'Chennai';
    handoverData.handed_over_by = req.user.name || req.user.username;

    // Handle files if uploaded via multer
    if (req.files) {
        if (req.files.photo) {
            handoverData.photo_url = `/uploads/${req.files.photo[0].filename}`;
        }
        if (req.files.signature) {
            handoverData.signature_url = `/uploads/${req.files.signature[0].filename}`;
        }
    }

    const handover = new Handover(handoverData);
    await handover.save();

    await logActivity(req, {
        action: 'HANDOVER',
        module: 'Handover',
        target_id: handoverData.asset_id.toUpperCase(),
        details: `Asset handed over to ${handoverData.recipient_name} (${handoverData.recipient_type})`
    });

    const asset = await Asset.findOne({ asset_id: handoverData.asset_id.toUpperCase() });
    if (asset) {
        const movementEntry = {
            from_department: asset.department,
            to_department: asset.department, // Handover usually happens within same dept or at point of deployment
            from_user: asset.assigned_user,
            to_user: handoverData.recipient_name,
            from_location: asset.location,
            to_location: asset.location,
            moved_by: req.user.name || req.user.username,
            moved_date: new Date(),
            action_type: 'Deploy',
            notes: `Handover Proof Captured: ${handoverData.recipient_type} recipient`,
        };
        asset.movement_history.push(movementEntry);
        asset.assigned_user = handoverData.recipient_name;
        asset.status = 'Active';
        await asset.save();
    }

    res.status(201).json({ success: true, data: handover });

    // Async: Notify Recipient
    (async () => {
      try {
        const recipient = await db.User.findOne({ 
          name: handoverData.recipient_name,
          expoPushToken: { $exists: true }
        });
        if (recipient?.expoPushToken) {
          await notificationService.sendPushNotification(
            [recipient.expoPushToken],
            `📦 ASSET ASSIGNED: ${handoverData.asset_id}`,
            `Asset has been deployed to you by ${handoverData.handed_over_by}.`,
            { type: 'HANDOVER_NEW', id: handover._id }
          );
        }
      } catch (e) { console.error('Notify error', e); }
    })();
};
// @POST /api/handovers/bulk — Create bulk handover records
exports.createBulkHandover = async (req, res) => {
    const { Handover, Asset } = req.models;

    // Parse JSON data from FormData string
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const { asset_ids, recipient_type, recipient_name, recipient_details } = data;

    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No assets selected.' });
    }

    const branch = req.branch || 'Chennai';
    const handed_over_by = req.user.name || req.user.username;

    let photo_url = null;
    let signature_url = null;

    // Handle files if uploaded via multer
    if (req.files) {
        if (req.files.photo) {
            photo_url = `/uploads/${req.files.photo[0].filename}`;
        }
        if (req.files.signature) {
            signature_url = `/uploads/${req.files.signature[0].filename}`;
        }
    }

    const results = [];

    for (const asset_id of asset_ids) {
        const idUpper = asset_id.toUpperCase();

        // Create individual handover record
        const handover = new Handover({
            asset_id: idUpper,
            recipient_type,
            recipient_name,
            recipient_details,
            photo_url,
            signature_url,
            handed_over_by,
            branch
        });
        await handover.save();

        // Update Asset status and assignment
        const asset = await Asset.findOne({ asset_id: idUpper });
        if (asset) {
            const movementEntry = {
                from_department: asset.department,
                to_department: asset.department,
                from_user: asset.assigned_user,
                to_user: recipient_name,
                from_location: asset.location,
                to_location: asset.location,
                moved_by: handed_over_by,
                moved_date: new Date(),
                action_type: 'Deploy',
                notes: `Bulk Handover Proof Captured: ${recipient_type} recipient`,
            };
            asset.movement_history.push(movementEntry);
            asset.assigned_user = recipient_name;
            asset.status = 'Active';
            await asset.save();
        }

        // Log individual activity
        await logActivity(req, {
            action: 'HANDOVER',
            module: 'Handover',
            target_id: idUpper,
            details: `Bulk handover to ${recipient_name} (${recipient_type})`
        });

        results.push(idUpper);
    }

    res.status(201).json({
        success: true,
        message: `${results.length} assets handed over successfully.`,
        data: results
    });

    // Async: Notify Recipient
    (async () => {
      try {
        const recipient = await db.User.findOne({ 
          name: recipient_name,
          expoPushToken: { $exists: true }
        });
        if (recipient?.expoPushToken) {
          await notificationService.sendPushNotification(
            [recipient.expoPushToken],
            `📦 BATCH DEPLOYMENT: ${results.length} Assets`,
            `${results.length} assets have been deployed to you.`,
            { type: 'HANDOVER_BULK', ids: results }
          );
        }
      } catch (e) { console.error('Notify error', e); }
    })();
};
