// @GET /api/dashboard
exports.getDashboardStats = async (req, res) => {
    const { Asset, SoftwareLicense, Ticket, SurveillanceAsset, CommunicationAsset, AssetType } = req.models;
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const [
        totalAssets,
        inStockCount,
        scrappedCount,
        assetsByDept,
        assetsByStatus,
        assetsByType,
        offlineDevices,
        warrantyExpiringSoon,
        warrantyExpired,
        openTickets,
        criticalTickets,
        licenseExpiringSoon,
        recentAssets,
        surveillanceCount,
        commCounts,
        allAssetTypes,
    ] = await Promise.all([
        Asset.countDocuments({ status: { $not: /^retired$/i } }),
        Asset.countDocuments({ status: /^In Stock$/i }),
        Asset.countDocuments({ status: /^Scrapped$/i }),

        Asset.aggregate([
            { $match: { status: { $not: /^retired$/i } } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),

        Asset.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        Asset.aggregate([
            { $match: { status: { $not: /^retired$/i } } },
            { $group: { _id: '$asset_type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),

        Asset.countDocuments({
            last_seen: { $lt: fifteenMinAgo },
            status: { $nin: [/^retired$/i, /^inactive$/i, /^scrapped$/i] }
        }),

        Asset.find({
            warranty_end: { $gte: now, $lte: thirtyDaysLater },
            status: { $not: /^retired$/i }
        }).select('asset_id hostname department warranty_end status').limit(10),

        Asset.countDocuments({
            warranty_end: { $lt: now },
            status: { $not: /^retired$/i }
        }),

        Ticket.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
        Ticket.countDocuments({ status: 'Open', priority: 'Critical' }),

        SoftwareLicense.find({
            expiry_date: { $gte: now, $lte: thirtyDaysLater }
        }).select('software_name vendor expiry_date seats_purchased seats_used').limit(10),

        Asset.find({ status: { $not: /^retired$/i } })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('asset_id asset_type hostname department status createdAt'),

        SurveillanceAsset.countDocuments({}),

        CommunicationAsset.aggregate([
            { $group: { _id: '$asset_type', count: { $sum: 1 } } }
        ]),

        AssetType.find({ active: true }).select('name icon code').lean()
    ]);

    // Map communication counts to a readable object
    const communications = {
        CUG: commCounts.find(c => c._id === 'CUG')?.count || 0,
        Mail: commCounts.find(c => c._id === 'Mail')?.count || 0,
        Landline: commCounts.find(c => c._id === 'Landline')?.count || 0,
        Total: commCounts.reduce((acc, curr) => acc + curr.count, 0)
    };

    res.status(200).json({
        success: true,
        data: {
            totalAssets,
            inStockCount,
            scrappedCount,
            assetsByDept,
            assetsByStatus,
            assetsByType,
            offlineDevices,
            warrantyExpiringSoon,
            warrantyExpired,
            openTickets,
            criticalTickets,
            licenseExpiringSoon,
            recentAssets,
            surveillanceCount,
            communications,
            assetTypes: allAssetTypes
        },
    });
};
