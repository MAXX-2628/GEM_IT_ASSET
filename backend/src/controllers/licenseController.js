const logActivity = require('../utils/activityLogger');

// @GET /api/licenses
exports.getLicenses = async (req, res) => {
    const { SoftwareLicense } = req.models;
    const { search, status, page = 1, limit = 20, startDate, endDate, sortField = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = {};
    if (status) query.status = status;

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    if (search) query.$or = [
        { software_name: new RegExp(search, 'i') },
        { vendor: new RegExp(search, 'i') },
    ];

    const sort = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [licenses, total] = await Promise.all([
        SoftwareLicense.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
        SoftwareLicense.countDocuments(query),
    ]);

    res.status(200).json({ success: true, total, data: licenses });
};

// @GET /api/licenses/:id
exports.getLicense = async (req, res) => {
    const { SoftwareLicense } = req.models;
    const license = await SoftwareLicense.findById(req.params.id);
    if (!license) return res.status(404).json({ success: false, message: 'License not found.' });
    res.status(200).json({ success: true, data: license });
};

// @POST /api/licenses
exports.createLicense = async (req, res) => {
    const { SoftwareLicense } = req.models;
    const license = await SoftwareLicense.create(req.body);

    await logActivity(req, {
        action: 'CREATE',
        module: 'Licenses',
        target_id: license.software_name,
        details: `License created for ${license.software_name}`
    });

    res.status(201).json({ success: true, data: license });
};

// @PUT /api/licenses/:id
exports.updateLicense = async (req, res) => {
    const { SoftwareLicense } = req.models;
    const license = await SoftwareLicense.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!license) return res.status(404).json({ success: false, message: 'License not found.' });

    await logActivity(req, {
        action: 'UPDATE',
        module: 'Licenses',
        target_id: license.software_name,
        details: `License updated: ${license.software_name}`
    });

    res.status(200).json({ success: true, data: license });
};

// @DELETE /api/licenses/:id
exports.deleteLicense = async (req, res) => {
    const { SoftwareLicense } = req.models;
    const license = await SoftwareLicense.findByIdAndDelete(req.params.id);

    if (license) {
        await logActivity(req, {
            action: 'DELETE',
            module: 'Licenses',
            target_id: license.software_name,
            details: `License deleted: ${license.software_name}`
        });
    }

    res.status(200).json({ success: true, message: 'License deleted.' });
};
