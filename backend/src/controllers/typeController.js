// @GET /api/types
exports.getTypes = async (req, res) => {
    const { AssetType } = req.models || {};
    if (!AssetType) return res.status(400).json({ success: false, message: 'Branch context missing.' });
    const types = await AssetType.find({ active: true }).sort({ name: 1 });
    res.status(200).json({ success: true, data: types });
};

// @POST /api/types
exports.createType = async (req, res) => {
    const { AssetType } = req.models || {};
    if (!AssetType) return res.status(400).json({ success: false, message: 'Branch context missing.' });
    const type = new AssetType(req.body);
    await type.save();
    res.status(201).json({ success: true, data: type });
};

// @PUT /api/types/:id
exports.updateType = async (req, res) => {
    const { AssetType } = req.models || {};
    if (!AssetType) return res.status(400).json({ success: false, message: 'Branch context missing.' });
    const type = await AssetType.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!type) return res.status(404).json({ success: false, message: 'Type not found.' });
    res.status(200).json({ success: true, data: type });
};

// @DELETE /api/types/:id
exports.deleteType = async (req, res) => {
    const { AssetType, Asset } = req.models || {};
    if (!AssetType) return res.status(400).json({ success: false, message: 'Branch context missing.' });
    const type = await AssetType.findById(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Type not found.' });

    // Check if any assets use this type
    const count = await Asset.countDocuments({ asset_type: type.name });
    if (count > 0) {
        return res.status(400).json({
            success: false,
            message: `Cannot delete. ${count} assets are currently using this category.`
        });
    }

    await type.deleteOne();
    res.status(200).json({ success: true, message: 'Category removed.' });
};
