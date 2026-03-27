// @GET /api/storage-types
exports.getStorageTypes = async (req, res) => {
    const { StorageType } = req.models;
    const types = await StorageType.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: types });
};

// @POST /api/storage-types
exports.createStorageType = async (req, res) => {
    const { StorageType } = req.models;
    const type = new StorageType(req.body);
    await type.save();
    res.status(201).json({ success: true, data: type });
};

// @PUT /api/storage-types/:id
exports.updateStorageType = async (req, res) => {
    const { StorageType } = req.models;
    const type = await StorageType.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!type) return res.status(404).json({ success: false, message: 'Storage type not found.' });
    res.status(200).json({ success: true, data: type });
};

// @DELETE /api/storage-types/:id
exports.deleteStorageType = async (req, res) => {
    const { StorageType, Asset } = req.models;
    const type = await StorageType.findById(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Storage type not found.' });

    // Check if any assets use this storage type
    const count = await Asset.countDocuments({ 'specs.storage_type': type.name });
    if (count > 0) {
        return res.status(400).json({
            success: false,
            message: `Cannot delete. ${count} assets are currently using this storage classification.`
        });
    }

    await type.deleteOne();
    res.status(200).json({ success: true, message: 'Storage classification removed.' });
};
