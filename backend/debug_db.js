require('dotenv').config();
const mongoose = require('mongoose');

async function debugDB() {
    try {
        const dbName = 'gem_itasset_chn';
        const baseUri = process.env.MONGODB_URI.split('?')[0];
        const uriParts = baseUri.split('/');
        uriParts[uriParts.length - 1] = dbName;
        const branchUri = uriParts.join('/') + (process.env.MONGODB_URI.includes('?') ? '?' + process.env.MONGODB_URI.split('?')[1] : '');

        const branchConn = await mongoose.createConnection(branchUri).asPromise();
        console.log(`Connected to branch DB: ${dbName}`);

        const collections = await branchConn.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        for (const col of collections) {
            const count = await branchConn.db.collection(col.name).countDocuments();
            console.log(`Collection ${col.name}: ${count} docs`);
        }

        await branchConn.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugDB();
