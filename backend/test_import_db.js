const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://127.0.0.1:27017/gem_itasset_chn');
    const db = mongoose.connection.db;

    const batches = await db.collection('importbatches').find().sort({ _id: -1 }).limit(3).toArray();
    console.log("Recent Import Batches:");
    batches.forEach(b => {
        console.log(`- Batch ID: ${b.batch_id}, Module: ${b.module}, Status: ${b.status}`);
        console.log(`  Total: ${b.total_records}, Success: ${b.success_count}, Failed: ${b.failed_count}`);
        if (b.errors && b.errors.length > 0) {
            console.log(`  Errors sample:`, b.errors.slice(0, 2));
        }
    });

    await mongoose.disconnect();
}

check().catch(console.error);
