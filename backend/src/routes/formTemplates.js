const express = require('express');
const router = express.Router();
const FormTemplate = require('../models/FormTemplate');

// Get all templates
router.get('/', async (req, res) => {
    try {
        const templates = await FormTemplate.find().sort({ createdAt: -1 });
        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new template
router.post('/', async (req, res) => {
    try {
        const { name, description, fields } = req.body;
        const template = new FormTemplate({ name, description, fields });
        await template.save();
        res.status(201).json({ success: true, data: template });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Delete template
router.delete('/:id', async (req, res) => {
    try {
        await FormTemplate.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
