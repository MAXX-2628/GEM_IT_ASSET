// @GET /api/communications
exports.getCommunications = async (req, res) => {
    try {
        const { CommunicationAsset } = req.models;
        const { type, department, status, search, page = 1, limit = 25, sortField = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = {};
        if (type) query.asset_type = type;
        if (department) query.department = department;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { starnumber: new RegExp(search, 'i') },
                { assigned_user: new RegExp(search, 'i') },
                { department: new RegExp(search, 'i') },
                { mobile_number: new RegExp(search, 'i') },
                { email_id: new RegExp(search, 'i') },
                { landline_number: new RegExp(search, 'i') },
            ];
        }

        const sort = {};
        sort[sortField] = sortOrder === 'asc' ? 1 : -1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [items, total] = await Promise.all([
            CommunicationAsset.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
            CommunicationAsset.countDocuments(query),
        ]);

        res.status(200).json({ success: true, total, data: items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @POST /api/communications
exports.createCommunication = async (req, res) => {
    const { CommunicationAsset } = req.models;
    try {
        const item = new CommunicationAsset(req.body);
        await item.save();
        res.status(201).json({ success: true, data: item });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @PUT /api/communications/:id
exports.updateCommunication = async (req, res) => {
    const { CommunicationAsset } = req.models;
    try {
        const item = await CommunicationAsset.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, data: item });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @DELETE /api/communications/:id
exports.deleteCommunication = async (req, res) => {
    const { CommunicationAsset } = req.models;
    try {
        const item = await CommunicationAsset.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
