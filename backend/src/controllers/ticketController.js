const { Branch } = require('../config/db');
const logActivity = require('../utils/activityLogger');

// @GET /api/tickets
exports.getTickets = async (req, res, next) => {
    try {
        const { Ticket } = req.models;
        const { status, priority, search, asset_ref, startDate, endDate, page = 1, limit = 20, sortField = 'createdAt', sortOrder = 'desc' } = req.query;

        const query = {};
        // Default filter: exclude 'Retired' and 'Scrapped' tickets unless a specific status is provided
        if (!status) {
            query.status = { $nin: ['Retired', 'Scrapped'] };
        } else {
            query.status = status;
        }
        if (priority) query.priority = priority;
        if (asset_ref) query.asset_ref = asset_ref;

        if (search) {
            query.$or = [
                { ticket_number: new RegExp(search, 'i') },
                { title: new RegExp(search, 'i') },
                { raised_by: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { asset_ref: new RegExp(search, 'i') },
                { department: new RegExp(search, 'i') },
            ];
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const sort = {};
        sort[sortField] = sortOrder === 'asc' ? 1 : -1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [tickets, total] = await Promise.all([
            Ticket.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
            Ticket.countDocuments(query),
        ]);

        res.status(200).json({ success: true, total, data: tickets });
    } catch (err) {
        next(err);
    }
};

// @GET /api/tickets/:id
exports.getTicket = async (req, res, next) => {
    try {
        const { Ticket } = req.models;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        res.status(200).json({ success: true, data: ticket });
    } catch (err) {
        next(err);
    }
};

// @POST /api/tickets
exports.createTicket = async (req, res, next) => {
    try {
        const { Ticket } = req.models;
        const ticket = await Ticket.create({ ...req.body });

        await logActivity(req, {
            action: 'CREATE',
            module: 'Tickets',
            target_id: ticket.ticket_number,
            details: `Ticket created: ${ticket.title}`
        });

        res.status(201).json({ success: true, data: ticket });
    } catch (err) {
        next(err);
    }
};

// @PUT /api/tickets/:id
exports.updateTicket = async (req, res, next) => {
    try {
        const { Ticket } = req.models;
        const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        // Set resolved_by if resolved
        if (ticket.status === 'Resolved' && !ticket.resolved_by) {
            ticket.resolved_by = req.user?.name || req.user?.username || 'Unknown';
            await ticket.save(); // Save again if resolved_by was updated
        }

        await logActivity(req, {
            action: 'UPDATE',
            module: 'Tickets',
            target_id: ticket.ticket_number,
            details: `Ticket updated. Status: ${ticket.status}`
        });

        res.status(200).json({ success: true, data: ticket });
    } catch (err) {
        next(err);
    }
};

// @DELETE /api/tickets/:id
exports.deleteTicket = async (req, res, next) => {
    try {
        const { Ticket } = req.models;
        const ticket = await Ticket.findByIdAndDelete(req.params.id);

        if (ticket) {
            await logActivity(req, {
                action: 'DELETE',
                module: 'Tickets',
                target_id: ticket.ticket_number,
                details: `Ticket deleted: ${ticket.title}`
            });
        }

        res.status(200).json({ success: true, message: 'Ticket deleted.' });
    } catch (err) {
        next(err);
    }
};
