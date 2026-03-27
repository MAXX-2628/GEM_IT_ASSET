const logActivity = require('../utils/activityLogger');
// --- Templates ---
exports.getTemplates = async (req, res, next) => {
    try {
        const { PMTemplate } = req.models;
        const templates = await PMTemplate.find().sort({ name: 1 });
        res.status(200).json({ success: true, data: templates });
    } catch (err) {
        next(err);
    }
};

exports.createTemplate = async (req, res, next) => {
    try {
        const { PMTemplate } = req.models;
        const template = new PMTemplate(req.body);
        await template.save();

        await logActivity(req, {
            action: 'CREATE_TEMPLATE',
            module: 'PM',
            target_id: template.name,
            details: `PM Template created: ${template.name}`
        });

        res.status(201).json({ success: true, data: template });
    } catch (err) {
        next(err);
    }
};

exports.updateTemplate = async (req, res, next) => {
    try {
        const { PMTemplate } = req.models;
        const template = await PMTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        await logActivity(req, {
            action: 'UPDATE_TEMPLATE',
            module: 'PM',
            target_id: template.name,
            details: `PM Template updated: ${template.name}`
        });

        res.status(200).json({ success: true, data: template });
    } catch (err) {
        next(err);
    }
};

exports.deleteTemplate = async (req, res, next) => {
    try {
        const { PMTemplate, PMSchedule } = req.models;

        // Check if being used by a policy
        const isUsed = await PMSchedule.findOne({ template_id: req.params.id });
        if (isUsed) {
            return res.status(400).json({ success: false, message: 'Template cannot be deleted as it is linked to an active PM Policy.' });
        }

        const template = await PMTemplate.findByIdAndDelete(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        await logActivity(req, {
            action: 'DELETE_TEMPLATE',
            module: 'PM',
            target_id: template.name,
            details: `PM Template deleted: ${template.name}`
        });

        res.status(200).json({ success: true, message: 'Template deleted' });
    } catch (err) {
        next(err);
    }
};

// --- Schedules (Policies) ---
exports.getSchedules = async (req, res, next) => {
    try {
        const { PMSchedule, PMRecord, Asset } = req.models;
        // 1. Get all active PM Policies (Schedules)
        const policies = await PMSchedule.find({
            status: 'Active'
        }).populate('template_id', 'name checklist').lean();

        // 2. We only care about assets that are active/live
        const liveStatuses = ['Active', 'Offline', 'Under Maintenance', 'In Stock'];

        // 3. Get matching asset types and asset IDs for batching
        const assetTypes = [...new Set(policies.map(p => p.asset_type))];

        // 4. Batch fetch matching assets
        const assets = await Asset.find({
            asset_type: { $in: assetTypes },
            status: { $in: liveStatuses }
        }).select('asset_id hostname department os status').lean();

        if (assets.length === 0) {
            const allPolicies = await PMSchedule.find().populate('template_id', 'name').lean();
            return res.status(200).json({ success: true, data: { tasks: [], policies: allPolicies } });
        }

        const assetIds = assets.map(a => a.asset_id);
        const policyIds = policies.map(p => p._id);

        // 5. Batch fetch all PM Records for these assets and policies
        // Sort by completed_date desc so the first one we find for a pair is the latest
        const records = await PMRecord.find({
            asset_id: { $in: assetIds },
            schedule_id: { $in: policyIds }
        }).sort({ completed_date: -1 }).lean();

        // 6. Create a lookup map for latest record: "policyId_assetId" -> lastRecord
        const latestRecordMap = {};
        for (const rec of records) {
            const key = `${rec.schedule_id}_${rec.asset_id}`;
            if (!latestRecordMap[key]) {
                latestRecordMap[key] = rec;
            }
        }

        // 7. Assemble tasks
        let allTaskSchedules = [];

        for (const policy of policies) {
            const matchingAssets = assets.filter(a => a.asset_type === policy.asset_type);

            for (const asset of matchingAssets) {
                const lastRecord = latestRecordMap[`${policy._id}_${asset.asset_id}`];

                // Calculate Next Due Date
                const baseDate = lastRecord ? lastRecord.completed_date : policy.start_date;
                const nextDate = new Date(baseDate);

                switch (policy.frequency) {
                    case 'Monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                    case 'Quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
                    case 'Half-Yearly': nextDate.setMonth(nextDate.getMonth() + 6); break;
                    case 'Yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                }

                allTaskSchedules.push({
                    _id: `${policy._id}_${asset.asset_id}`, // UI key
                    policy_id: policy._id,
                    asset_id: asset.asset_id,
                    asset_details: asset,
                    template_id: policy.template_id,
                    frequency: policy.frequency,
                    last_completed_date: lastRecord ? lastRecord.completed_date : null,
                    last_proof: lastRecord?.attachments?.[0] || null, // Exposure for UI
                    next_due_date: nextDate,
                    base_start_date: policy.start_date
                });
            }
        }

        // Include the original policies too for the settings/management view
        const allPolicies = await PMSchedule.find().populate('template_id', 'name').lean();

        // Sort generated tasks by due date
        allTaskSchedules.sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date));

        res.status(200).json({ success: true, data: { tasks: allTaskSchedules, policies: allPolicies } });
    } catch (err) {
        next(err);
    }
};

exports.createSchedule = async (req, res, next) => {
    try {
        const { PMSchedule } = req.models;
        // Check if policy for this type+template already exists
        const existing = await PMSchedule.findOne({
            asset_type: req.body.asset_type,
            template_id: req.body.template_id
        });
        if (existing) {
            return res.status(400).json({ success: false, message: 'A PM Policy for this Asset Type and Template already exists.' });
        }

        const schedule = new PMSchedule(req.body);
        await schedule.save();

        await logActivity(req, {
            action: 'CREATE_POLICY',
            module: 'PM',
            target_id: schedule.asset_type,
            details: `PM Policy created for ${schedule.asset_type} using ${schedule.frequency} frequency`
        });

        res.status(201).json({ success: true, data: schedule });
    } catch (err) {
        next(err);
    }
};

exports.updateSchedule = async (req, res, next) => {
    try {
        const { PMSchedule } = req.models;
        const schedule = await PMSchedule.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'PM Policy not found' });
        }

        await logActivity(req, {
            action: 'UPDATE_POLICY',
            module: 'PM',
            target_id: schedule.asset_type,
            details: `PM Policy updated for ${schedule.asset_type}`
        });

        res.status(200).json({ success: true, data: schedule });
    } catch (err) {
        next(err);
    }
};

exports.deleteSchedule = async (req, res, next) => {
    try {
        const { PMSchedule } = req.models;
        const schedule = await PMSchedule.findByIdAndDelete(req.params.id);

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'PM Policy not found' });
        }

        await logActivity(req, {
            action: 'DELETE_POLICY',
            module: 'PM',
            target_id: schedule.asset_type,
            details: `PM Policy deleted for ${schedule.asset_type}`
        });

        res.status(200).json({ success: true, message: 'PM Policy deleted' });
    } catch (err) {
        next(err);
    }
};

// --- PM Completion ---
exports.completePM = async (req, res, next) => {
    try {
        const { PMSchedule, Asset, PMRecord } = req.models;
        const parsed = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const { schedule_id, engineer_name, checklist_results, remarks } = parsed;

        // Handle compound UI IDs (policyId_assetId)
        const realPolicyId = schedule_id.includes('_') ? schedule_id.split('_')[0] : schedule_id;
        const asset_id = parsed.asset_id || (schedule_id.includes('_') ? schedule_id.split('_').slice(1).join('_') : null);

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Proof of maintenance (Photo/PDF) is mandatory for NABH compliance.' });
        }

        const policy = await PMSchedule.findById(realPolicyId);
        if (!policy) return res.status(404).json({ success: false, message: 'PM Policy not found.' });

        // Ensure asset exists
        const asset = await Asset.findOne({ asset_id });
        if (!asset) {
            console.error(`Asset not found for ID: ${asset_id}`);
            return res.status(404).json({ success: false, message: `Asset not found: ${asset_id}` });
        }

        const record = new PMRecord({
            schedule_id: realPolicyId,
            asset_id,
            engineer_name,
            checklist_results,
            remarks,
            attachments: req.files.map(f => ({
                name: f.originalname,
                url: `/uploads/${f.filename}`,
                file_type: f.mimetype
            })),
            all_passed: checklist_results.every(r => r.status)
        });

        await record.save();

        await logActivity(req, {
            action: 'COMPLETE_PM',
            module: 'PM',
            target_id: asset_id,
            details: `PM Maintenance completed by ${engineer_name}`
        });

        res.status(201).json({ success: true, data: record });
    } catch (err) {
        console.error('PM Complete Error:', err);
        next(err); // Changed from res.status(500) to next(err)
    }
};

// --- History ---
exports.getGlobalHistory = async (req, res, next) => { // Added next
    try {
        const { PMRecord } = req.models;
        const { asset_id, engineer, from, to, frequency, page = 1, limit = 20, sortField = 'completed_date', sortOrder = 'desc' } = req.query;

        const query = {};
        if (asset_id) query.asset_id = { $regex: asset_id, $options: 'i' };
        if (engineer) query.engineer_name = { $regex: engineer, $options: 'i' };

        if (from || to) {
            query.completed_date = {};
            if (from) query.completed_date.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                query.completed_date.$lte = toDate;
            }
        }

        // If frequency filter is provided, we need to find matching schedules first
        if (frequency) {
            const { PMSchedule } = req.models;
            const matchingSchedules = await PMSchedule.find({ frequency }).select('_id');
            query.schedule_id = { $in: matchingSchedules.map(s => s._id) };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = {};
        sort[sortField] = sortOrder === 'asc' ? 1 : -1;

        const [records, total] = await Promise.all([
            PMRecord.find(query)
                .populate({
                    path: 'schedule_id',
                    populate: { path: 'template_id', select: 'name' }
                })
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            PMRecord.countDocuments(query)
        ]);
        res.status(200).json({ success: true, data: records, total }); // Added status
    } catch (err) {
        console.error('Get Global History Error:', err);
        next(err); // Already next(err), but ensuring consistency
    }
};

exports.getAssetHistory = async (req, res, next) => {
    try {
        const { PMRecord } = req.models;
        const records = await PMRecord.find({ asset_id: req.params.assetId })
            .populate('schedule_id', 'frequency')
            .sort({ completed_date: -1 });
        res.status(200).json({ success: true, data: records });
    } catch (err) {
        next(err);
    }
};
