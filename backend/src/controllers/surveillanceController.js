const logActivity = require('../utils/activityLogger');
const { generateNextAssetId } = require('../utils/idGenerator');

exports.getSurveillanceAssets = async (req, res) => {
    const { SurveillanceAsset } = req.models;
    const { page = 1, limit = 20, search, status, nvr, sortField = 'location', sortOrder = 'asc' } = req.query;

    const query = {};
    if (status && status !== 'All') query.status = status;
    if (nvr && nvr !== 'All') query.nvr_connection = nvr;

    if (search) {
        query.$or = [
            { location: new RegExp(search, 'i') },
            { ip_address: new RegExp(search, 'i') },
            { serial_number: new RegExp(search, 'i') },
            { nvr_connection: new RegExp(search, 'i') },
            { asset_id: new RegExp(search, 'i') }
        ];
    }

    const sort = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    try {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [assets, total, summary, nvrs] = await Promise.all([
            SurveillanceAsset.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            SurveillanceAsset.countDocuments(query),
            // Get overall status summary for metrics
            SurveillanceAsset.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            // Get unique nvr_connection list for filter
            SurveillanceAsset.distinct('nvr_connection')
        ]);

        const stats = {
            total: summary.reduce((acc, curr) => acc + curr.count, 0),
            active: summary.find(s => s._id === 'Active')?.count || 0,
            faulty: summary.find(s => s._id === 'Faulty')?.count || 0,
            maintenance: summary.find(s => s._id === 'Maintenance')?.count || 0,
            scrapped: summary.find(s => s._id === 'Scrapped')?.count || 0,
        };

        res.status(200).json({
            success: true,
            data: assets,
            total,
            stats,
            nvrs: nvrs.filter(Boolean).sort(),
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        console.error('Error fetching surveillance assets:', err);
        res.status(500).json({ success: false, message: 'Failed to load surveillance data' });
    }
};

exports.createSurveillanceAsset = async (req, res) => {
    const { SurveillanceAsset, Asset, AssetType, Counter } = req.models;
    const branchCode = req.branchCode || 'CHN';
    const branchName = req.branchName || 'Chennai';

    // 1. Generate the next 4-digit numeric Asset ID if not provided
    const assetId = req.body.asset_id ? req.body.asset_id.toUpperCase() : await generateNextAssetId(Asset, AssetType, Counter, branchCode, 'Camera');

    // 2. Create the IT Asset record
    const newAssetData = {
        asset_id: assetId,
        asset_type: 'Camera',
        department: 'Surveillance',
        location: req.body.location,
        status: req.body.status || 'Active',
        ip_address: req.body.ip_address,
        mac_address: '', // Optional
        branch: branchName,
        specs: {
            serial_number: req.body.serial_number,
            model: 'Surveillance Camera'
        },
        credentials: {
            username: req.body.username,
            password: req.body.password
        },
        notes: req.body.notes || 'Automatically created from Surveillance registration',
        movement_history: [{
            moved_by: req.user.name || req.user.username || 'System',
            moved_date: new Date(),
            action_type: 'Deploy',
            notes: `Initial deployment to ${req.body.location}`
        }]
    };

    const itAsset = await Asset.create(newAssetData);

    // 3. Create the Surveillance Asset record with the shared ID
    const survAsset = await SurveillanceAsset.create({
        ...req.body,
        asset_id: assetId
    });

    // LOG ACTIVITY
    await logActivity(req, {
        action: 'CREATE',
        module: 'Surveillance',
        target_id: assetId,
        details: `Camera registered and IT Asset created: ${req.body.location}`
    });

    res.status(201).json({ success: true, data: survAsset });
};

exports.updateSurveillanceAsset = async (req, res) => {
    const { SurveillanceAsset, Asset } = req.models;
    const body = req.body;

    const survAsset = await SurveillanceAsset.findByIdAndUpdate(req.params.id, body, {
        new: true,
        runValidators: true,
    });

    if (!survAsset) {
        return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Synchronize with IT Asset if linked
    if (survAsset.asset_id) {
        await Asset.findOneAndUpdate(
            { asset_id: survAsset.asset_id, asset_type: 'Camera' },
            {
                $set: {
                    location: survAsset.location,
                    ip_address: survAsset.ip_address,
                    status: survAsset.status,
                    'specs.serial_number': survAsset.serial_number,
                    'credentials.username': survAsset.username,
                    'credentials.password': survAsset.password,
                    notes: survAsset.notes
                }
            }
        );
    }

    res.status(200).json({ success: true, data: survAsset });
};

exports.deleteSurveillanceAsset = async (req, res) => {
    const { SurveillanceAsset, Asset, AssetType, Counter } = req.models;
    const branchCode = req.branchCode || 'CHN';
    const branchName = req.branchName || 'Chennai';

    try {
        const asset = await SurveillanceAsset.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        // Move to Scrapped status in Surveillance
        asset.status = 'Scrapped';
        await asset.save();

        // Synchronize with IT Inventory
        let itAsset = null;
        if (asset.asset_id) {
            itAsset = await Asset.findOne({ asset_id: asset.asset_id, asset_type: 'Camera' });
        }

        if (itAsset) {
            // Update existing IT asset
            const movementEntry = {
                from_department: itAsset.department,
                to_department: itAsset.department,
                from_user: itAsset.assigned_user,
                to_user: itAsset.assigned_user,
                from_location: itAsset.location,
                to_location: itAsset.location,
                moved_by: req.user.name || req.user.username || 'System',
                moved_date: new Date(),
                action_type: 'Scrap',
                notes: `Scrapped from Surveillance System at ${asset.location}`,
            };

            if (!itAsset.movement_history) itAsset.movement_history = [];
            itAsset.movement_history.push(movementEntry);
            itAsset.status = 'Scrapped';
            await itAsset.save();
        } else {
            // Should not happen with new sync logic, but handle legacy
            const assetId = await generateNextAssetId(Asset, AssetType, Counter, branchCode, 'Camera');
            const newAssetData = {
                asset_id: assetId,
                asset_type: 'Camera',
                department: 'Surveillance',
                location: asset.location,
                status: 'Scrapped',
                ip_address: asset.ip_address,
                branch: branchName,
                specs: {
                    serial_number: asset.serial_number,
                    model: 'Surveillance Camera'
                },
                notes: `Automatically created from scrapping surveillance camera at ${asset.location}`,
                movement_history: [{
                    moved_by: req.user.name || req.user.username || 'System',
                    moved_date: new Date(),
                    action_type: 'Scrap',
                    notes: 'Initial entry created at scrap'
                }]
            };

            await Asset.create(newAssetData);
            asset.asset_id = assetId;
            await asset.save();
        }

        // LOG ACTIVITY
        await logActivity(req, {
            action: 'SCRAP',
            module: 'Surveillance',
            target_id: asset.asset_id || asset.serial_number,
            details: `Surveillance camera at ${asset.location} moved to scrap and sync'd with IT Inventory.`
        });

        res.status(200).json({ success: true, message: 'Camera moved to scrap successfully' });
    } catch (err) {
        console.error('Scrap error:', err);
        res.status(500).json({ success: false, message: 'Internal server error during scrap' });
    }
};

exports.deployToSurveillance = async (req, res) => {
    const { SurveillanceAsset, Asset } = req.models;
    const { asset_id, location, ip_address, serial_number, nvr_connection, linked_nvr_id, username, password, status, notes } = req.body;

    // 1. Create Surveillance record
    const survAsset = await SurveillanceAsset.create({
        location,
        ip_address,
        serial_number,
        nvr_connection,
        linked_nvr_id,
        username,
        password,
        status,
        notes: notes || `Deployed from IT Inventory (${asset_id})`,
        asset_id: asset_id
    });

    // 2. Update IT Asset
    const itAsset = await Asset.findOne({ asset_id: asset_id.toUpperCase() });
    if (itAsset) {
        const movementEntry = {
            from_department: itAsset.department,
            to_department: 'SURVEILLANCE',
            from_user: itAsset.assigned_user,
            to_user: 'Surveillance System',
            from_location: itAsset.location,
            to_location: location,
            moved_by: req.user.name || req.user.username,
            moved_date: new Date(),
            action_type: 'Deploy',
            notes: `Deployed to Surveillance System at ${location}`,
        };

        itAsset.movement_history.push(movementEntry);
        itAsset.status = 'Active';
        itAsset.location = location;
        itAsset.department = 'Surveillance';

        await itAsset.save();

        // LOG ACTIVITY
        await logActivity(req, {
            action: 'DEPLOY',
            module: 'Surveillance',
            target_id: asset_id,
            details: `Camera deployed to Surveillance System: ${location}`
        });
    }

    res.status(201).json({ success: true, data: survAsset });
};

// @GET /api/surveillance/next-id — Get the next available Camera ID
exports.getNextId = async (req, res) => {
    const { Asset, AssetType, Counter } = req.models;
    const branchCode = req.branchCode || 'CHN';

    try {
        const nextId = await generateNextAssetId(Asset, AssetType, Counter, branchCode, 'Camera', true);
        res.status(200).json({ success: true, data: nextId });
    } catch (err) {
        console.error('Error fetching next surveillance ID:', err);
        res.status(500).json({ success: false, message: 'Failed to generate next ID' });
    }
};
