// @GET /api/floors
exports.getFloors = async (req, res) => {
    const { Floor } = req.models;
    const floors = await Floor.find({ active: true }).sort({ name: 1 });
    res.status(200).json({ success: true, data: floors });
};

// @POST /api/floors
exports.createFloor = async (req, res) => {
    const { Floor } = req.models;
    const floor = new Floor(req.body);
    await floor.save();
    res.status(201).json({ success: true, data: floor });
};

// @PUT /api/floors/:id
exports.updateFloor = async (req, res) => {
    const { Floor } = req.models;
    const floor = await Floor.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!floor) return res.status(404).json({ success: false, message: 'Floor not found.' });
    res.status(200).json({ success: true, data: floor });
};

// @DELETE /api/floors/:id
exports.deleteFloor = async (req, res) => {
    const { Floor, Department } = req.models;
    const floor = await Floor.findById(req.params.id);
    if (!floor) return res.status(404).json({ success: false, message: 'Floor not found.' });

    // Check if any departments use this floor
    const count = await Department.countDocuments({ floor: floor.name });
    if (count > 0) {
        return res.status(400).json({
            success: false,
            message: `Cannot delete. ${count} departments are currently assigned to this floor.`
        });
    }

    await floor.deleteOne();
    res.status(200).json({ success: true, message: 'Floor removed.' });
};
