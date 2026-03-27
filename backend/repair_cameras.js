const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/gem_itasset_chn';

async function run() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    console.log('Restoring wrongfully Scrapped NVRs...');
    // 1. Find NVRs currently scrapped and return them to Active
    const nvrsToRestore = await db.collection('assets').find({ 
        asset_type: { $in: ['NVR', 'DVR', 'Server', 'SERVER'] },
        status: 'Scrapped'
    }).toArray();
    
    let restoredCount = 0;
    for (let nvr of nvrsToRestore) {
        await db.collection('assets').updateOne(
            { _id: nvr._id },
            { $set: { status: 'Active' } }
        );
        restoredCount++;
    }
    console.log(`Restored ${restoredCount} mistakenly scrapped NVRs back to Active.`);

    console.log('Fixing corrupt Camera Asset_IDs...');
    // 2. Identify Surveillance Assets whose asset_id == linked_nvr_id or starts with NVR-
    const cameras = await db.collection('surveillanceassets').find({}).toArray();
    let corruptCount = 0;
    
    for (let cam of cameras) {
        if (cam.asset_id && (cam.asset_id === cam.linked_nvr_id || cam.asset_id.startsWith('NVR-'))) {
            // Generate a placeholder missing ID or null it out so the system can regenerate it if needed.
            // Nulling it is safer, the controller handles missing IT assets safely.
            await db.collection('surveillanceassets').updateOne(
                { _id: cam._id },
                { $unset: { asset_id: "" } }
            );
            corruptCount++;
        }
    }
    console.log(`Detached rogue NVR IDs from ${corruptCount} surveillance cameras.`);

    process.exit(0);
}

run().catch(console.error);
