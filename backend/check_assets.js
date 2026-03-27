require('dotenv').config();
const mongoose = require('mongoose');

async function checkExistingAssets() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to master DB');

        // Try to connect to Chennai branch DB
        const dbName = 'gem_itasset_chn';
        const baseUri = process.env.MONGODB_URI.split('?')[0];
        const uriParts = baseUri.split('/');
        uriParts[uriParts.length - 1] = dbName;
        const branchUri = uriParts.join('/') + (process.env.MONGODB_URI.includes('?') ? '?' + process.env.MONGODB_URI.split('?')[1] : '');

        const branchConn = await mongoose.createConnection(branchUri).asPromise();
        console.log(`Connected to branch DB: ${dbName}`);

        const AssetSchema = require('./src/models/Asset').schema;
        const Asset = branchConn.model('Asset', AssetSchema);

        const assets = await Asset.find().limit(5);
        console.log('Existing assets:', JSON.stringify(assets, null, 2));

        await branchConn.close();
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkExistingAssets();
