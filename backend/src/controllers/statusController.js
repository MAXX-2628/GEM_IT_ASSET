// @GET /api/statuses
exports.getStatuses = async (req, res) => {
    const { Status } = req.models;
    const statuses = await Status.find({ active: true }).sort({ name: 1 });
    res.status(200).json({ success: true, data: statuses });
};

// @POST /api/statuses
exports.createStatus = async (req, res) => {
    const { Status } = req.models;
    const status = new Status(req.body);
    await status.save();
    res.status(201).json({ success: true, data: status });
};

// @PUT /api/statuses/:id
exports.updateStatus = async (req, res) => {
    const { Status } = req.models;
    const status = await Status.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!status) return res.status(404).json({ success: false, message: 'Status not found.' });
    res.status(200).json({ success: true, data: status });
};

// @DELETE /api/statuses/:id
exports.deleteStatus = async (req, res) => {
    const { Status, Asset } = req.models;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found.' });

    // Check if any assets use this status
    const count = await Asset.countDocuments({ status: status.name });
    if (count > 0) {
        return res.status(400).json({
            success: false,
            message: `Cannot delete. ${count} assets are currently using this status.`
        });
    }

    await status.deleteOne();
    res.status(200).json({ success: true, message: 'Status removed.' });
};
