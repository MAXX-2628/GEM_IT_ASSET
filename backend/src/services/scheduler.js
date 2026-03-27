const cron = require('node-cron');
const { getBranchConnection, getBranchModels } = require('../config/tenantManager');
const db = require('../config/db');
const emailService = require('./emailService');
const logger = require('../config/logger');

const runScheduler = () => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        logger.info('⏰ Scheduler tick — checking device health and alerts across all branches...');
        try {
            // Get all active branches from Master DB
            if (!db.Branch) {
                logger.warn('⚠️ Scheduler skipped tick: Master models not yet initialized.');
                return;
            }

            // --- 1. Cleanup Expired Branches (Soft Delete Lifecycle) ---
            const expiredBranches = await db.Branch.find({
                isDeleted: true,
                restoreExpiresAt: { $lt: new Date() }
            });

            if (expiredBranches.length > 0) {
                for (const b of expiredBranches) {
                    logger.info(`♻️ Permanently deleting expired branch: ${b.name} (${b.code})`);
                    await db.Branch.deleteOne({ _id: b._id });
                    // NOTE: In a real multi-db setup, we might also drop the tenant database here if required
                }
            }

            // --- 2. Check Alerts for Active Branches ---
            const branches = await db.Branch.find({ isDeleted: false, status: 'Active' });

            for (const branch of branches) {
                try {
                    const connection = await getBranchConnection(branch.code);
                    const models = getBranchModels(connection);

                    await checkOfflineDevices(models, branch.name);
                    await checkWarrantyExpiry(models, branch.name);
                    await checkLicenseExpiry(models, branch.name);
                } catch (branchErr) {
                    logger.error(`Scheduler error for branch ${branch.name}: ${branchErr.message}`);
                }
            }
        } catch (err) {
            logger.error(`Scheduler main loop error: ${err.message}`);
        }
    });

    logger.info('✅ Background scheduler started (every 5 minutes, multi-branch enabled)');
};

async function checkOfflineDevices(models, branchName) {
    const { Asset } = models;
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    const offlineDevices = await Asset.find({
        last_seen: { $lt: fifteenMinAgo },
        status: { $in: ['Active'] },
    });

    if (offlineDevices.length > 0) {
        // Mark as Offline
        await Asset.updateMany(
            { _id: { $in: offlineDevices.map((d) => d._id) } },
            { status: 'Offline' }
        );

        const deviceList = offlineDevices
            .map((d) => `<li>${d.asset_id} — ${d.hostname} (${d.department})</li>`)
            .join('');

        await emailService.sendAlertEmail(
            `⚠️ GEM Hospital IT (${branchName}) — ${offlineDevices.length} Device(s) Offline`,
            `<h2>Offline Devices Detected in ${branchName}</h2>
       <p>The following devices have not reported in the last 15 minutes:</p>
       <ul>${deviceList}</ul>
       <p><small>GEM Hospital IT Asset Management System</small></p>`
        );

        logger.warn(`[${branchName}] ${offlineDevices.length} device(s) marked offline.`);
    }
}

async function checkWarrantyExpiry(models, branchName) {
    const { Asset } = models;
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringAssets = await Asset.find({
        warranty_end: { $gte: now, $lte: thirtyDaysLater },
        status: { $ne: 'Retired' },
    }).select('asset_id hostname department warranty_end');

    if (expiringAssets.length > 0) {
        const rows = expiringAssets
            .map(
                (a) =>
                    `<tr><td>${a.asset_id}</td><td>${a.hostname}</td><td>${a.department}</td><td>${new Date(a.warranty_end).toLocaleDateString()}</td></tr>`
            )
            .join('');

        await emailService.sendAlertEmail(
            `⚠️ GEM Hospital IT (${branchName}) — ${expiringAssets.length} Warranty Expiry Alert(s)`,
            `<h2>Warranty Expiring Soon in ${branchName} (Within 30 Days)</h2>
       <table border="1" cellpadding="6" cellspacing="0">
         <thead><tr><th>Asset ID</th><th>Hostname</th><th>Department</th><th>Expiry</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>
       <p><small>GEM Hospital IT Asset Management System</small></p>`
        );

        logger.warn(`[${branchName}] ${expiringAssets.length} warranties expiring soon.`);
    }
}

async function checkLicenseExpiry(models, branchName) {
    const { SoftwareLicense } = models;
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringLicenses = await SoftwareLicense.find({
        expiry_date: { $gte: now, $lte: thirtyDaysLater },
    }).select('software_name vendor expiry_date seats_purchased');

    if (expiringLicenses.length > 0) {
        const rows = expiringLicenses
            .map(
                (l) =>
                    `<tr><td>${l.software_name}</td><td>${l.vendor}</td><td>${l.seats_purchased}</td><td>${new Date(l.expiry_date).toLocaleDateString()}</td></tr>`
            )
            .join('');

        await emailService.sendAlertEmail(
            `⚠️ GEM Hospital IT (${branchName}) — ${expiringLicenses.length} License Expiry Alert(s)`,
            `<h2>Software Licenses Expiring Soon in ${branchName} (Within 30 Days)</h2>
       <table border="1" cellpadding="6" cellspacing="0">
         <thead><tr><th>Software</th><th>Vendor</th><th>Seats</th><th>Expiry</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>
       <p><small>GEM Hospital IT Asset Management System</small></p>`
        );

        logger.warn(`[${branchName}] ${expiringLicenses.length} licenses expiring soon.`);
    }
}

module.exports = { runScheduler };
