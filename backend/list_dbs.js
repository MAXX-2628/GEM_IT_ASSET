require('dotenv').config();
const mongoose = require('mongoose');

async function listAllDBs() {
    try {
        const client = await mongoose.connect(process.env.MONGODB_URI);
        const admin = client.connection.db.admin();
        const dbs = await admin.listDatabases();

        console.log('Databases on this server:');
        for (const db of dbs.databases) {
            if (db.name.startsWith('gem_itasset')) {
                console.log(`- ${db.name}`);
                const dbInstance = client.connection.useDb(db.name);
                const collections = await dbInstance.db.listCollections().toArray();
                for (const col of collections) {
                    const count = await dbInstance.db.collection(col.name).countDocuments();
                    console.log(`  - ${col.name}: ${count} docs`);
                }
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listAllDBs();
