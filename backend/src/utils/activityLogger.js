/**
 * Logs an activity to the database
 * @param {Object} req - Express request object (contains user and models)
 * @param {Object} data - Log data
 */
const logActivity = async (req, { action, module, target_id, details }) => {
    try {
        const { ActivityLog } = req.models;
        if (!ActivityLog) return;

        const log = new ActivityLog({
            user: req.user?.name || req.user?.username || 'System',
            action,
            module,
            target_id,
            details: typeof details === 'object' ? JSON.stringify(details) : details,
            branch: req.branch || 'Chennai'
        });

        await log.save();
    } catch (err) {
        console.error('Failed to log activity:', err.message);
    }
};

module.exports = logActivity;
