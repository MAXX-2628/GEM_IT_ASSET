const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/gem_itasset_chn';

async function run() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    // Fix IT Assets (NVR/DVR/Server) whose asset_id is purely numeric
    const assets = await db.collection('assets').find({ 
        asset_type: { $in: ['NVR', 'DVR', 'Server', 'SERVER', 'nvr', 'dvr', 'server'] }
    }).toArray();

    let countAssets = 0;
    for (let asset of assets) {
        if (/^\d{4,}$/.test(asset.asset_id)) {
            const newId = `NVR-${asset.asset_id}`;
            await db.collection('assets').updateOne(
                { _id: asset._id },
                { $set: { asset_id: newId } }
            );
            countAssets++;
        }
    }
    console.log(`Updated ${countAssets} records in IT Assets with NVR- prefix`);

    // Fix SurveillanceAssets
    const cameras = await db.collection('surveillanceassets').find({}).toArray();
    let countCameras = 0;
    for (let cam of cameras) {
        let updated = false;
        let updateDoc = {};

        if (cam.nvr_connection && /^\d{4,}$/.test(cam.nvr_connection.trim())) {
            updateDoc.nvr_connection = `NVR-${cam.nvr_connection.trim()}`;
            updated = true;
        }

        if (cam.linked_nvr_id && /^\d{4,}$/.test(cam.linked_nvr_id.trim())) {
            updateDoc.linked_nvr_id = `NVR-${cam.linked_nvr_id.trim()}`;
            updated = true;
        }

        if (updated) {
            await db.collection('surveillanceassets').updateOne(
                { _id: cam._id },
                { $set: updateDoc }
            );
            countCameras++;
        }
    }
    console.log(`Updated ${countCameras} records in Surveillance registry with NVR- prefix`);

    process.exit(0);
}

run().catch(console.error);
