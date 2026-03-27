require('dotenv').config();
const mongoose = require('mongoose');

async function checkMetadata() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to master DB');

        const BranchSchema = require('./src/models/Branch').schema;
        const Branch = mongoose.model('Branch', BranchSchema);
        const branches = await Branch.find();
        console.log('Branches:', JSON.stringify(branches, null, 2));

        const dbName = 'gem_itasset_chennai';
        const baseUri = process.env.MONGODB_URI.split('?')[0];
        const uriParts = baseUri.split('/');
        uriParts[uriParts.length - 1] = dbName;
        const branchUri = uriParts.join('/') + (process.env.MONGODB_URI.includes('?') ? '?' + process.env.MONGODB_URI.split('?')[1] : '');

        const branchConn = await mongoose.createConnection(branchUri).asPromise();
        console.log(`Connected to branch DB: ${dbName}`);

        const AssetTypeSchema = require('./src/models/AssetType').schema;
        const DepartmentSchema = require('./src/models/Department').schema;

        const AssetType = branchConn.model('AssetType', AssetTypeSchema);
        const Department = branchConn.model('Department', DepartmentSchema);

        const types = await AssetType.find();
        const depts = await Department.find();

        console.log('AssetTypes:', JSON.stringify(types, null, 2));
        console.log('Departments:', JSON.stringify(depts, null, 2));

        await branchConn.close();
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkMetadata();
