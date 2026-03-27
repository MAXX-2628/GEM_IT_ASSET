const db = require('../config/db');

exports.getSettings = async (req, res) => {
    try {
        let settings = await db.Settings.findOne();
        if (!settings) {
            settings = await db.Settings.create({});
        }
        res.status(200).json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { themeMode, primaryColor } = req.body;
        let settings = await db.Settings.findOne();
        
        if (!settings) {
            settings = new db.Settings();
        }

        if (themeMode) settings.themeMode = themeMode;
        if (primaryColor) settings.primaryColor = primaryColor;

        await settings.save();
        res.status(200).json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
};
