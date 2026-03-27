require('dotenv').config();
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { getBranchConnection, getBranchModels } = require('./src/config/tenantManager');

async function importSwitches() {
    const filePath = '../Switch.xlsx';
    const workbook = new ExcelJS.Workbook();

    try {
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);

        const headers = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) headers[cell.value.toString().trim().toLowerCase()] = colNumber;
        });

        const conn = await getBranchConnection('CHN');
        const { Asset } = getBranchModels(conn);

        let inserted = 0;
        let skipped = 0;
        let errors = 0;

        console.log('--- STARTING IMPORT ---');

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            if (!row.hasValues) continue;

            const getVal = (name) => {
                const idx = headers[name.toLowerCase()];
                if (!idx) return null;
                let val = row.getCell(idx).value;
                if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
                return val ? val.toString().trim() : null;
            };

            const asset_id = getVal('Asset ID');
            if (!asset_id) {
                console.warn(`[ROW ${i}] Missing Asset ID, skipping.`);
                skipped++;
                continue;
            }

            // Check for existing asset
            const existing = await Asset.findOne({ asset_id: asset_id.toUpperCase() });
            if (existing) {
                console.log(`[ROW ${i}] ${asset_id} already exists, skipping.`);
                skipped++;
                continue;
            }

            const data = {
                branch: 'Chennai',
                asset_id: asset_id.toUpperCase(),
                asset_type: 'Switch',
                sub_category: getVal('Sub-Category'),
                hostname: getVal('Hostname'),
                mac_address: getVal('MAC Address'),
                ip_address: getVal('IP Address'),
                department: getVal('Department') || 'IT STOCK',
                location: getVal('Floor / Location'),
                status: getVal('Status') || 'Active',
                specs: {
                    cpu: getVal('CPU'),
                    ram: getVal('RAM'),
                    storage: getVal('Storage'),
                    storage_type: getVal('Storage Type'),
                    os: getVal('OS'),
                    model: getVal('Model'),
                    serial_number: getVal('Serial Number'),
                    custom: {
                        stack_id: getVal('Stack id'),
                        vlan: getVal('Vlan'),
                        physical_stacking: getVal('Physical Stacking')
                    }
                },
                credentials: [
                    {
                        label: 'Primary',
                        username: getVal('Username 1'),
                        password: getVal('Password 1') || getVal('Password 2') // Some rows might have it in col 21 or 19 depending on header mapping
                    },
                    {
                        label: 'Secondary',
                        username: getVal('Username 2'),
                        password: getVal('Password 2')
                    }
                ],
                batch_id: 'IMPORT_SWITCH_20260309'
            };

            try {
                await Asset.create(data);
                console.log(`[ROW ${i}] Imported ${asset_id}`);
                inserted++;
            } catch (err) {
                console.error(`[ROW ${i}] Error importing ${asset_id}:`, err.message);
                errors++;
            }
        }

        console.log(`\nImport Summary:`);
        console.log(`Inserted: ${inserted}`);
        console.log(`Skipped:  ${skipped}`);
        console.log(`Errors:   ${errors}`);

        process.exit(0);
    } catch (err) {
        console.error('Import failed:', err.message);
        process.exit(1);
    }
}

importSwitches();
