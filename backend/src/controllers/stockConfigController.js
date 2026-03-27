// @GET /api/stock-config
// Query param: type (optional filter)
exports.getConfigs = async (req, res) => {
    const { StockConfig } = req.models;
    const { type } = req.query;

    const query = { isActive: true };
    if (type) query.type = type;

    const configs = await StockConfig.find(query).sort({ type: 1, name: 1 });
    res.status(200).json({ success: true, data: configs });
};

// @POST /api/stock-config
exports.createConfig = async (req, res) => {
    const { StockConfig } = req.models;
    const config = await StockConfig.create(req.body);
    res.status(201).json({ success: true, data: config, message: 'Configuration created' });
};

// @PUT /api/stock-config/:id
exports.updateConfig = async (req, res) => {
    const { StockConfig } = req.models;
    const config = await StockConfig.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!config) return res.status(404).json({ success: false, message: 'Configuration not found.' });
    res.status(200).json({ success: true, data: config, message: 'Configuration updated' });
};

// @DELETE /api/stock-config/:id
exports.deleteConfig = async (req, res) => {
    const { StockConfig } = req.models;
    // Soft delete
    const config = await StockConfig.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
    );
    if (!config) return res.status(404).json({ success: false, message: 'Configuration not found.' });
    res.status(200).json({ success: true, message: 'Configuration deactivated.' });
};
