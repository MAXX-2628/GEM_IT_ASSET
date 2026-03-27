const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema(
    {
        branch: {
            type: String,
            default: 'Chennai',
            trim: true
        },
        ticket_number: {
            type: String,
            unique: true,
        },
        title: {
            type: String,
            required: [true, 'Ticket title is required'],
            trim: true,
        },
        description: { type: String },
        raised_by: { type: String, required: true },
        department: { type: String },
        asset_ref: { type: String }, // asset_id reference
        asset_hostname: { type: String },
        status: {
            type: String,
            enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
            default: 'Open',
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium',
        },
        resolved_by: { type: String },
        resolved_at: { type: Date },
        resolution_notes: { type: String },

        // NABH / Maintenance Fields
        failure_type: {
            type: String,
            enum: ['Hardware', 'Software', 'Network', 'User Error', 'Power', 'Physical Damage', 'Other'],
            default: 'Hardware'
        },
        action_taken: {
            type: String,
            enum: ['Repaired', 'Replaced', 'Sent to Vendor', 'Parts Pending', 'Software Fix', 'Other'],
            default: 'Repaired'
        },
        spares_used: { type: String, trim: true },
        tat_minutes: { type: Number, default: 0 },
        downtime_hours: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Auto-generate ticket number and calculate TAT
TicketSchema.pre('save', async function (next) {
    if (!this.ticket_number) {
        const Counter = this.constructor.model('Counter');
        const counter = await Counter.findOneAndUpdate(
            { id: 'ticket' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.ticket_number = `TKT-${String(counter.seq).padStart(5, '0')}`;
    }

    // Calculate TAT if status changes to Resolved
    if (this.isModified('status') && this.status === 'Resolved') {
        this.resolved_at = new Date();
        const diffMs = this.resolved_at - this.createdAt;
        this.tat_minutes = Math.round(diffMs / 60000);
        this.downtime_hours = Number((diffMs / 3600000).toFixed(2));
    }

    next();
});

TicketSchema.index({ status: 1 });
TicketSchema.index({ asset_ref: 1 });

module.exports = { schema: TicketSchema };
