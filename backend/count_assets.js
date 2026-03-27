
const mongoose = require('mongoose');
require('dotenv').config();
const { getBranchConnection, getBranchModels } = require('./src/config/tenantManager');

async function run() {
    try {
        const conn = await getBranchConnection('CHN');
        const { Asset } = getBranchModels(conn);
        const counts = await Asset.aggregate([
            { $group: { _id: '$asset_type', count: { $sum: 1 } } }
        ]);
        console.log(JSON.stringify(counts, null, 2));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
