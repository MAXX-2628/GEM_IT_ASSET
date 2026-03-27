// @GET /api/departments
exports.getDepartments = async (req, res) => {
    const { Department } = req.models;
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, data: departments });
};

// @POST /api/departments
exports.createDepartment = async (req, res) => {
    const { Department } = req.models;
    const department = await Department.create(req.body);
    res.status(201).json({ success: true, data: department });
};

// @PUT /api/departments/:id
exports.updateDepartment = async (req, res) => {
    const { Department } = req.models;
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });
    res.status(200).json({ success: true, data: department });
};

// @DELETE /api/departments/:id
exports.deleteDepartment = async (req, res) => {
    const { Department } = req.models;
    const department = await Department.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
    );
    if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });
    res.status(200).json({ success: true, message: 'Department deactivated.' });
};
