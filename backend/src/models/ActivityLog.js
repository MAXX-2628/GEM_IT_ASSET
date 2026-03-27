const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    user: {
        type: String, // User Name or Email
        required: true,
    },
    action: {
        type: String, // e.g., 'CREATE', 'UPDATE', 'DELETE', 'TRANSFER'
        required: true,
    },
    module: {
        type: String, // e.g., 'Assets', 'Tickets', 'PM', 'Handover'
        required: true,
    },
    target_id: {
        type: String, // e.g., Asset ID or Ticket ID
    },
    details: {
        type: String, // JSON string or human readable description
    },
    branch: {
        type: String,
        required: true,
    }
}, { timestamps: true });

// Index for filtering by date and branch
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ branch: 1 });
ActivityLogSchema.index({ module: 1 });

module.exports = { schema: ActivityLogSchema };
