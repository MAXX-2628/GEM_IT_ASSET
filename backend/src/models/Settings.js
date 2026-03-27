const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    themeMode: {
        type: String,
        default: 'system',
        enum: ['light', 'dark', 'system']
    },
    primaryColor: {
        type: String,
        default: '#FF6A00'
    },
    // Add more global settings here if needed
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
