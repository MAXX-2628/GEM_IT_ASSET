const logActivity = require('../utils/activityLogger');
const { Branch, Department } = require('../config/db');

const { generateNextAssetId } = require('../utils/idGenerator');

// @GET /api/assets — List all assets with filters
exports.getAssets = async (req, res, next) => {
    try {
        if (!req.models || !req.models.Asset) {
            return res.status(400).json({ success: false, message: 'Branch context missing. Please select a branch.' });
        }
        const { Asset } = req.models;
        const { search, department, status, asset_type, page = 1, limit = 20, startDate, endDate, sortField = 'createdAt', sortOrder = 'desc' } = req.query;

        const query = {};
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

        if (department) query.department = new RegExp(department, 'i');

        if (status) {
            if (status === 'Live') {
                query.status = { $in: ['Active', 'active', 'Offline', 'offline', 'Under Maintenance', 'Under maintenance', 'Maintenance', 'maintenance', 'Faulty', 'faulty', 'Repairing', 'repairing', 'Standby', 'standby'] };
            } else if (status === 'Scrapped') {
                query.status = { $in: ['Scrapped', 'scrapped', 'Retired', 'retired', 'Disposed', 'disposed'] };
            } else if (status === 'online') {
                query.last_seen = { $gte: fifteenMinAgo };
                query.status = { $nin: ['Retired', 'Scrapped', 'retired', 'scrapped'] };
            } else if (status === 'offline') {
                query.$or = [
                    { last_seen: { $lt: fifteenMinAgo } },
                    { last_seen: { $exists: false } },
                    { last_seen: null }
                ];
                query.status = { $nin: ['Retired', 'Scrapped', 'retired', 'scrapped'] };
            } else {
                // Case-insensitive exact match
                query.status = new RegExp(`^${status}$`, 'i');
            }
        } else {
            // Default: exclude Retired/Scrapped
            query.status = { $nin: ['Retired', 'Scrapped', 'retired', 'scrapped'] };
        }

        if (asset_type) query.asset_type = asset_type;

        // Date range filtering (by createdAt)
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
            const searchOr = [
                { asset_id: new RegExp(search, 'i') },
                { hostname: new RegExp(search, 'i') },
                { mac_address: new RegExp(search, 'i') },
                { ip_address: new RegExp(search, 'i') },
                { department: new RegExp(search, 'i') },
                { location: new RegExp(search, 'i') },
            ];
            if (query.$or) {
                query.$and = [{ $or: query.$or }, { $or: searchOr }];
                delete query.$or;
            } else {
                query.$or = searchOr;
            }
        }

        const sort = {};
        sort[sortField] = sortOrder === 'asc' ? 1 : -1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [assets, total] = await Promise.all([
            Asset.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
            Asset.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: assets,
        });
    } catch (err) {
        next(err);
    }
};

// @GET /api/assets/:id
exports.getAsset = async (req, res, next) => {
    try {
        if (!req.models || !req.models.Asset) {
            return res.status(400).json({ success: false, message: 'Branch context missing.' });
        }
        const { Asset } = req.models;
        const asset = await Asset.findOne({ asset_id: req.params.id.toUpperCase() }).lean();
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

        // Fetch peripherals (children)
        const peripherals = await Asset.find({ parent_asset_id: asset.asset_id }).select('asset_id asset_type status');
        asset.peripherals = peripherals;

        res.status(200).json({ success: true, data: asset });
    } catch (err) {
        next(err);
    }
};

// @POST /api/assets — Create asset
exports.createAsset = async (req, res, next) => {
    try {
        if (!req.models || !req.models.Asset) {
            return res.status(400).json({ success: false, message: 'Branch context missing.' });
        }
        const { Asset, AssetType, Counter } = req.models;
        // Parse JSON data from FormData string
        const assetData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

        // Explicitly initialize attachments array to prevent undefined issues
        if (!assetData.attachments) assetData.attachments = [];
        const asset = new Asset(assetData);

        // Handle file attachment
        if (req.file) {
            asset.attachments.push({
                name: req.file.originalname,
                url: `/uploads/${req.file.filename}`,
                file_type: req.file.mimetype,
                uploaded_at: new Date()
            });
        }

        // Auto-generate asset_id if not provided
        if (!assetData.asset_id) {
            const branchCode = req.branchCode || 'CHN';
            asset.asset_id = await generateNextAssetId(Asset, AssetType, Counter, branchCode, assetData.asset_type);
        }

        await asset.save();

        // LOG ACTIVITY
        await logActivity(req, {
            action: 'CREATE',
            module: 'Assets',
            target_id: asset.asset_id,
            details: `Asset created: ${asset.asset_type} (${asset.hostname || 'No Hostname'})`
        });

        res.status(201).json({ success: true, data: asset });
    } catch (err) {
        next(err);
    }
};

const { flattenObject } = require('../utils/objectUtils');

// @PUT /api/assets/:id — Update asset
exports.updateAsset = async (req, res, next) => {
    try {
        const { Asset } = req.models;
        const assetData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

        // Prevent overwriting attachments with old data from the form
        delete assetData.attachments;

        // Handle file attachment if new one uploaded
        if (req.file) {
            const fileEntry = {
                name: req.file.originalname,
                url: `/uploads/${req.file.filename}`,
                file_type: req.file.mimetype,
                uploaded_at: new Date()
            };
            // Add to attachments array
            await Asset.findOneAndUpdate(
                { asset_id: req.params.id.toUpperCase() },
                { $push: { attachments: fileEntry } }
            );
        }

        // Use dot-notation for nested updates to avoid overwriting sub-documents like specs
        const updateData = flattenObject(assetData);

        const asset = await Asset.findOneAndUpdate(
            { asset_id: req.params.id.toUpperCase() },
            { $set: updateData },
            { new: true, runValidators: true }
        );


        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

        // Record movement as EDIT
        const movementEntry = {
            action_type: 'Edit',
            moved_by: req.user.name || req.user.username,
            moved_date: new Date(),
            notes: `System Detail Update: ${Object.keys(assetData).join(', ')}`,
            from_department: asset.department,
            to_department: asset.department,
            from_user: asset.assigned_user,
            to_user: asset.assigned_user,
            from_location: asset.location,
            to_location: asset.location
        };
        await Asset.findOneAndUpdate(
            { asset_id: req.params.id.toUpperCase() },
            { $push: { movement_history: movementEntry } }
        );

        // LOG ACTIVITY
        await logActivity(req, {
            action: 'UPDATE',
            module: 'Assets',
            target_id: asset.asset_id,
            details: `Asset updated. Changes: ${Object.keys(assetData).join(', ')}`
        });

        res.status(200).json({ success: true, data: asset });
    } catch (err) {
        next(err);
    }
};

// @DELETE /api/assets/:id — Scrap asset
exports.deleteAsset = async (req, res, next) => {
    try {
        const { Asset, SurveillanceAsset } = req.models;
        const asset = await Asset.findOne({ asset_id: req.params.id.toUpperCase() });
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

        // Record movement to scrap
        const movementEntry = {
            from_department: asset.department,
            to_department: asset.department,
            from_user: asset.assigned_user,
            to_user: asset.assigned_user,
            from_location: asset.location,
            to_location: asset.location,
            moved_by: req.user.name || req.user.username,
            moved_date: new Date(),
            action_type: 'Scrap',
            notes: 'Asset Scrapped',
        };

        asset.movement_history.push(movementEntry);
        asset.status = 'Scrapped';
        asset.parent_asset_id = null; // Unlink if it was a peripheral

        await asset.save();

        // Sync with Surveillance: if this is a Camera, scrap its SurveillanceAsset too
        if (asset.asset_type === 'Camera') {
            await SurveillanceAsset.updateOne(
                { asset_id: asset.asset_id },
                { $set: { status: 'Scrapped' } }
            );
        }

        // If this is an NVR/DVR/Server, clear linked_nvr_id on surveillance cameras
        if (/NVR|DVR|Server/i.test(asset.asset_type)) {
            await SurveillanceAsset.updateMany(
                { linked_nvr_id: asset.asset_id },
                { $set: { linked_nvr_id: '' } }
            );
        }

        // LOG ACTIVITY
        await logActivity(req, {
            action: 'SCRAP',
            module: 'Assets',
            target_id: asset.asset_id,
            details: `Asset moved to Scrap Inventory`
        });

        res.status(200).json({ success: true, message: 'Asset scrapped successfully.' });
    } catch (err) {
        next(err);
    }
};

// @POST /api/assets/:id/transfer — Transfer or Deploy asset
exports.transferAsset = async (req, res, next) => {
    try {
        const { Asset } = req.models;
        const { to_department, to_user, to_location, notes, action_type } = req.body;
        const asset = await Asset.findOne({ asset_id: req.params.id.toUpperCase() });

        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

        const finalActionType = action_type || 'Transfer';

        const movementEntry = {
            from_department: asset.department,
            to_department: to_department || asset.department,
            from_user: asset.assigned_user,
            to_user: to_user || asset.assigned_user,
            from_location: asset.location,
            to_location: to_location || asset.location,
            moved_by: req.user.name || req.user.username,
            moved_date: new Date(),
            action_type: finalActionType,
            notes,
        };

        asset.movement_history.push(movementEntry);
        if (to_department) asset.department = to_department;
        if (to_user !== undefined) asset.assigned_user = to_user;
        if (to_location) asset.location = to_location;

        // Transition status to Active if deploying
        if (finalActionType === 'Deploy') {
            asset.status = 'Active';
        }

        await asset.save();

        // LOG ACTIVITY
        await logActivity(req, {
            action: finalActionType.toUpperCase(),
            module: 'Assets',
            target_id: asset.asset_id,
            details: `${finalActionType}ed: ${asset.department} → ${to_department || asset.department}`
        });

        res.status(200).json({ success: true, data: asset });
    } catch (err) {
        next(err);
    }
};

// @DELETE /api/assets/:id/remove — Hard delete from Stock
exports.removeAsset = async (req, res, next) => {
    try {
        const { Asset, SurveillanceAsset } = req.models;
        const asset = await Asset.findOne({ asset_id: req.params.id.toUpperCase() });

        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

        // Only allow remove from Stock
        if (asset.status !== 'In Stock') {
            return res.status(400).json({ success: false, message: 'Only assets in Stock can be permanently removed. Use Scrap for deployed assets.' });
        }

        await Asset.findOneAndDelete({ asset_id: req.params.id.toUpperCase() });

        // Sync with Surveillance: if this is a Camera, also delete its SurveillanceAsset
        if (asset.asset_type === 'Camera') {
            await SurveillanceAsset.deleteOne({ asset_id: asset.asset_id });
        }

        // If this is an NVR/DVR/Server, clear linked_nvr_id on surveillance cameras
        if (/NVR|DVR|Server/i.test(asset.asset_type)) {
            await SurveillanceAsset.updateMany(
                { linked_nvr_id: asset.asset_id },
                { $set: { linked_nvr_id: '' } }
            );
        }

        // LOG ACTIVITY
        await logActivity(req, {
            action: 'DELETE',
            module: 'Assets',
            target_id: asset.asset_id,
            details: `Asset permanently removed from Stock inventory`
        });

        res.status(200).json({ success: true, message: 'Asset removed successfully.' });
    } catch (err) {
        next(err);
    }
};

// @POST /api/assets/:id/scrap — Scrap asset and handle linked peripherals
exports.scrapAsset = async (req, res) => {
    const { Asset, SurveillanceAsset } = req.models;
    const { peripheralActions = [] } = req.body; // Array of { asset_id, action: 'scrap' | 'stock' }
    const assetId = req.params.id.toUpperCase();

    try {
        const mainAsset = await Asset.findOne({ asset_id: assetId });
        if (!mainAsset) return res.status(404).json({ success: false, message: 'Asset not found.' });

        // 1. Process Main Asset
        const mainMovement = {
            from_department: mainAsset.department,
            to_department: mainAsset.department,
            from_user: mainAsset.assigned_user,
            to_user: mainAsset.assigned_user,
            from_location: mainAsset.location,
            to_location: mainAsset.location,
            moved_by: req.user.name || req.user.username,
            moved_date: new Date(),
            action_type: 'Scrap',
            notes: 'Main Asset Scrapped',
        };

        mainAsset.movement_history.push(mainMovement);
        mainAsset.status = 'Scrapped';
        mainAsset.parent_asset_id = null;
        await mainAsset.save();

        // Sync with Surveillance: if this is a Camera, scrap its SurveillanceAsset too
        if (mainAsset.asset_type === 'Camera') {
            await SurveillanceAsset.updateOne(
                { asset_id: mainAsset.asset_id },
                { $set: { status: 'Scrapped' } }
            );
        }

        // If this is an NVR/DVR/Server, clear linked_nvr_id on surveillance cameras
        if (/NVR|DVR|Server/i.test(mainAsset.asset_type)) {
            await SurveillanceAsset.updateMany(
                { linked_nvr_id: mainAsset.asset_id },
                { $set: { linked_nvr_id: '' } }
            );
        }

        // 2. Process Peripheral Actions
        for (const act of peripheralActions) {
            const p = await Asset.findOne({ asset_id: act.asset_id.toUpperCase() });
            if (!p) continue;

            const pMovement = {
                from_department: p.department,
                from_user: p.assigned_user,
                from_location: p.location,
                moved_by: req.user.name || req.user.username,
                moved_date: new Date(),
                action_type: act.action === 'scrap' ? 'Scrap' : 'Transfer',
                notes: act.action === 'scrap' ? 'Scrapped with parent' : 'Returned to Stock after parent scrapped',
            };

            if (act.action === 'scrap') {
                p.status = 'Scrapped';
                pMovement.to_department = p.department;
                pMovement.to_user = p.assigned_user;
                pMovement.to_location = p.location;
            } else {
                p.status = 'In Stock';
                p.department = 'IT STOCK';
                p.assigned_user = '';
                p.location = 'STORE';
                pMovement.to_department = 'IT STOCK';
                pMovement.to_user = '';
                pMovement.to_location = 'STORE';
            }

            p.parent_asset_id = null;
            p.movement_history.push(pMovement);
            await p.save();
        }

        // LOG ACTIVITY
        await logActivity(req, {
            action: 'SCRAP',
            module: 'Assets',
            target_id: assetId,
            details: `Asset scrapped along with ${peripheralActions.length} peripheral decisions.`
        });

        res.status(200).json({ success: true, message: 'Asset and peripherals processed successfully' });
    } catch (err) {
        console.error('Scrap error:', err);
        res.status(500).json({ success: false, message: 'Internal server error during scrap' });
    }
};
// @GET /api/assets/next-id — Get the next available Asset ID
exports.getNextId = async (req, res) => {
    const { Asset, AssetType, Counter } = req.models;
    const branchCode = req.branchCode || 'CHN';
    const assetType = req.query.asset_type || '';

    try {
        const nextId = await generateNextAssetId(Asset, AssetType, Counter, branchCode, assetType, true);
        res.status(200).json({ success: true, data: nextId });
    } catch (err) {
        next(err);
    }
};

// @GET /api/assets/search — Autocomplete search
exports.searchAssets = async (req, res, next) => {
    try {
        const { Asset } = req.models;
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(200).json({ success: true, data: [] });
        }

        const query = {
            $or: [
                { asset_id: new RegExp(q, 'i') },
                { hostname: new RegExp(q, 'i') }
            ],
            status: { $nin: ['Retired', 'Scrapped'] }
        };

        const results = await Asset.find(query)
            .select('asset_id hostname department location status')
            .limit(10)
            .lean();

        res.status(200).json({ success: true, data: results });
    } catch (err) {
        next(err);
    }
};
