const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
require('dotenv').config();
const { getBranchConnection, getBranchModels } = require('./src/config/tenantManager');

async function verifyImport() {
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
        const { Asset, AssetType, Department } = getBranchModels(conn);

        const types = (await AssetType.find({}, 'name')).map(t => t.name.toLowerCase());
        const depts = (await Department.find({}, 'name')).map(d => d.name.toLowerCase());

        console.log('--- VALIDATION RESULTS ---');
        const rowCount = worksheet.rowCount;
        let errors = 0;
        let warnings = 0;
        let valid = 0;

        for (let i = 2; i <= rowCount; i++) {
            const row = worksheet.getRow(i);
            if (!row.hasValues) continue;

            const getVal = (name) => {
                const idx = headers[name.toLowerCase()];
                if (!idx) return null;
                let val = row.getCell(idx).value;
                if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
                return val ? val.toString().trim() : null;
            };

            const data = {
                asset_id: getVal('Asset ID'),
                asset_type: getVal('Asset Type'),
                mac_address: getVal('MAC Address'),
                ip_address: getVal('IP Address'),
                department: getVal('Department')
            };

            const rowErrors = [];
            if (!data.asset_id) rowErrors.push('Missing Asset ID');
            if (!data.asset_type) rowErrors.push('Missing Asset Type');
            else if (!types.includes(data.asset_type.toLowerCase())) rowErrors.push(`Unknown Type: ${data.asset_type}`);

            if (!data.mac_address) rowErrors.push('Missing MAC Address');
            if (!data.ip_address) rowErrors.push('Missing IP Address');

            // Duplicate Checks
            if (data.asset_id) {
                const dupId = await Asset.findOne({ asset_id: data.asset_id.toUpperCase() });
                if (dupId) rowErrors.push(`Duplicate ID: ${data.asset_id} exists as ${dupId.asset_type}`);
            }
            if (data.mac_address && data.mac_address !== '3NULL1' && !data.mac_address.includes('NULL')) {
                // Ignoring the test '3NULL1' etc. from the dump for serious check
                const dupMac = await Asset.findOne({ mac_address: data.mac_address });
                if (dupMac) rowErrors.push(`Duplicate MAC: ${data.mac_address} exists as ${dupMac.asset_id}`);
            }
            if (data.ip_address) {
                const dupIp = await Asset.findOne({ ip_address: data.ip_address });
                if (dupIp) rowErrors.push(`Duplicate IP: ${data.ip_address} exists as ${dupIp.asset_id}`);
            }

            if (rowErrors.length > 0) {
                console.log(`[ROW ${i}] ${data.asset_id || 'UNKNOWN'}: ${rowErrors.join(', ')}`);
                errors++;
            } else {
                valid++;
            }
        }

        console.log(`\nSummary: ${rowCount - 1} total rows, ${valid} valid, ${errors} errors.`);
        process.exit(0);
    } catch (err) {
        console.error('Validation failed:', err.message);
        process.exit(1);
    }
}

verifyImport();
