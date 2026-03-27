// @GET /api/vendors
exports.getVendors = async (req, res) => {
    const { Vendor } = req.models;
    const vendors = await Vendor.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, data: vendors });
};

// @POST /api/vendors
exports.createVendor = async (req, res) => {
    const { Vendor } = req.models;
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ success: true, data: vendor });
};

// @PUT /api/vendors/:id
exports.updateVendor = async (req, res) => {
    const { Vendor } = req.models;
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
    res.status(200).json({ success: true, data: vendor });
};

// @DELETE /api/vendors/:id
exports.deleteVendor = async (req, res) => {
    const { Vendor } = req.models;
    const vendor = await Vendor.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
    );
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
    res.status(200).json({ success: true, message: 'Vendor deactivated.' });
};
