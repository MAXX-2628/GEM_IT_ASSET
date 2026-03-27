require('dotenv').config();
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const path = require('path');

// Import models
const AssetSchema = require('../src/models/Asset').schema;
const AssetTypeSchema = require('../src/models/AssetType').schema;
const DepartmentSchema = require('../src/models/Department').schema;
const BranchSchema = require('../src/models/Branch').schema;
const { seedBranchDefaults } = require('../src/services/seedService');

const BRANCH_CODE = 'CHN';
const EXCEL_PATH = path.join(__dirname, '..', '..', 'asset pc.xlsx');

async function importAssets() {
    try {
        console.log('🚀 Starting Asset Import...');

        // 1. Connect to Master DB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to Master DB');

        const Branch = mongoose.model('Branch', BranchSchema);
        const branch = await Branch.findOne({ code: BRANCH_CODE });
        if (!branch) {
            console.error(`❌ Branch ${BRANCH_CODE} not found in Master DB`);
            process.exit(1);
        }

        // 2. Connect to Branch DB
        const dbName = `gem_itasset_${BRANCH_CODE.toLowerCase()}`;
        const baseUri = process.env.MONGODB_URI.split('?')[0];
        const uriParts = baseUri.split('/');
        uriParts[uriParts.length - 1] = dbName;
        const branchUri = uriParts.join('/') + (process.env.MONGODB_URI.includes('?') ? '?' + process.env.MONGODB_URI.split('?')[1] : '');

        const branchConn = await mongoose.createConnection(branchUri).asPromise();
        console.log(`✅ Connected to Branch DB: ${dbName}`);

        const Asset = branchConn.model('Asset', AssetSchema);
        const AssetType = branchConn.model('AssetType', AssetTypeSchema);
        const Department = branchConn.model('Department', DepartmentSchema);
        const Status = branchConn.model('Status', require('../src/models/Status').schema);
        const Floor = branchConn.model('Floor', require('../src/models/Floor').schema);

        // 3. Seed defaults first
        console.log('🌱 Seeding branch defaults...');
        await seedBranchDefaults({ AssetType, Status, Department, Floor }, branch.name);

        // 4. Read Excel
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(EXCEL_PATH);
        const worksheet = workbook.getWorksheet(1);

        const headers = [];
        worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
            headers[colNumber] = cell.value?.toString().trim();
        });

        console.log(`📊 Processing ${worksheet.rowCount - 1} rows...`);

        let count = 0;
        let errors = 0;

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const data = {};
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                data[headers[colNumber]] = cell.value;
            });

            if (!data['Assettype'] || !data['DEPT']) continue;

            try {
                // Ensure AssetType exists
                let type = await AssetType.findOne({ name: new RegExp(`^${data['Assettype']}$`, 'i') });
                if (!type) {
                    let baseCode = data['Assettype'].substring(0, 3).toUpperCase();
                    let code = baseCode;
                    let suffix = 1;
                    while (await AssetType.findOne({ code })) {
                        code = `${baseCode}${suffix++}`;
                    }
                    type = await AssetType.create({ name: data['Assettype'], code });
                    console.log(`➕ Created AssetType: ${data['Assettype']} (${code})`);
                }

                // Ensure Department exists
                let dept = await Department.findOne({ name: new RegExp(`^${data['DEPT']}$`, 'i') });
                if (!dept) {
                    let baseCode = data['DEPT'].substring(0, 3).toUpperCase();
                    let code = baseCode;
                    let suffix = 1;
                    while (await Department.findOne({ code })) {
                        code = `${baseCode}${suffix++}`;
                    }
                    dept = await Department.create({ name: data['DEPT'], code });
                    console.log(`➕ Created Department: ${data['DEPT']} (${code})`);
                }

                // Generate Asset ID (Follow assetController logic)
                const deptCode = dept.code || data['DEPT'].substring(0, 3).toUpperCase();
                const typeCode = type.code || data['Assettype'].substring(0, 3).toUpperCase();
                let subCode = '';
                if (data['Sub CATEGORY']) {
                    subCode = data['Sub CATEGORY'].replace(/[^A-Z]/gi, '').substring(0, 3).toUpperCase();
                }

                const prefix = `GEM-${BRANCH_CODE}-${deptCode}-${typeCode}${subCode ? '-' + subCode : ''}`;

                // For simplicity in script, we can use S NO or timestamp to avoid heavy sequence checking
                const sno = data['S NO'] || i;
                const asset_id = `${prefix}-${sno.toString().padStart(3, '0')}`;

                const assetData = {
                    branch: branch.name,
                    asset_id: asset_id,
                    asset_type: data['Assettype'],
                    department: data['DEPT'],
                    assigned_user: data['Assigned User'] || 'Unassigned',
                    sub_category: data['Sub CATEGORY'],
                    location: data['Floor'],
                    mac_address: data['MAC Address'] || `IMPORT-${sno.toString().padStart(4, '0')}`,
                    status: 'Active',
                    specs: {
                        cpu: data['CPU']?.toString(),
                        ram: data['RAM']?.toString(),
                        storage: data['STORAGE']?.toString(),
                        storage_type: data['STORAGE TYPE']?.toString(),
                        os: data['OS']?.toString(),
                        model: data['MODEL']?.toString(),
                        serial_number: data['SYSTEM SERIALNUMBER']?.toString()
                    },
                    notes: 'Imported from Excel'
                };

                const existing = await Asset.findOne({ asset_id: asset_id });
                if (existing) {
                    console.log(`⏭️ Skipping existing asset: ${asset_id}`);
                    continue;
                }

                await Asset.create(assetData);
                count++;
                if (count % 10 === 0) console.log(`✅ Imported ${count} assets...`);
            } catch (err) {
                console.error(`❌ Error importing row ${i}:`, err.message);
                errors++;
            }
        }

        console.log(`\n✨ Import Complete!`);
        console.log(`✅ Total Assets Imported: ${count}`);
        console.log(`❌ Failures/Errors: ${errors}`);

        await branchConn.close();
        await mongoose.disconnect();
    } catch (error) {
        console.error('💥 Fatal Error:', error);
        process.exit(1);
    }
}

importAssets();
