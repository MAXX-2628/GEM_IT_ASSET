const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // e.g., 'ticket', 'asset_SRV', 'asset_NVR'
    seq: { type: Number, default: 0 }
});

module.exports = { schema: CounterSchema };
