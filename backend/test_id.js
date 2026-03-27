const mongoose = require('mongoose');
const { Branch, User } = require('./src/config/db');

async function testFormat() {
    await mongoose.connect('mongodb://localhost:27017/master_db');
    const branch = await Branch.findOne({ name: 'Chennai' });

    // Connect to branch DB
    const branchDbURI = `mongodb://localhost:27017/${branch.db_name}`;
    const branchConnection = await mongoose.createConnection(branchDbURI).asPromise();

    const AssetSchema = require('./src/models/Asset').schema;
    const AssetTypeSchema = require('./src/models/AssetType').schema;

    const Asset = branchConnection.model('Asset', AssetSchema);
    const AssetType = branchConnection.model('AssetType', AssetTypeSchema);

    // Simulate what the controller does
    const assetData = { asset_type: 'Desktop', department: 'Cardiology' };
    const type = await AssetType.findOne({ name: assetData.asset_type });

    const deptCode = 'IT';
    const branchCode = branch.code || 'CHN';

    let prefix = `GEM-${branchCode}-${deptCode}-${type?.code || 'AST'}`;

    const lastAsset = await Asset.findOne({
        asset_id: new RegExp(`^${prefix}-`, 'i')
    }).sort({ asset_id: -1 });

    let nextNum = 1;
    if (lastAsset && lastAsset.asset_id.includes('-')) {
        const parts = lastAsset.asset_id.split('-');
        const lastNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const newId = `${prefix}-${nextNum.toString().padStart(4, '0')}`;
    console.log('New Asset ID Format:', newId);

    // Simulate label generation
    const seqParts = newId.split('-');
    const seqStr = seqParts[seqParts.length - 1]; // e.g. "01" or "0001"
    const seqNum = parseInt(seqStr) || 1;
    const paddedSeq = seqNum.toString().padStart(4, '0');

    const typeCode = type?.code || assetData.asset_type.substring(0, 3).toUpperCase();
    const fullText = `GEM/${branchCode}/IT/${typeCode}/${paddedSeq}`;
    console.log('Printed Label Format:', fullText);

    mongoose.disconnect();
}

testFormat().catch(console.error);
