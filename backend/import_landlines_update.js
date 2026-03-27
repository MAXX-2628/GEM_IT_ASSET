// import_landlines_update.js — upsert all rows from Star Number.xlsx
require('dotenv').config();
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { schema: CommSchema } = require('./src/models/CommunicationAsset');

async function run() {
    const uri = process.env.MONGODB_URI;
    const parts = uri.split('?')[0].split('/');
    parts[parts.length - 1] = 'gem_itasset_chn';
    const branchUri = parts.join('/') + (uri.includes('?') ? '?' + uri.split('?')[1] : '');
    const conn = await mongoose.createConnection(branchUri).asPromise();
    const CA = conn.model('CommunicationAsset', CommSchema);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../Star Number.xlsx');
    const ws = wb.getWorksheet(1);

    let upserted = 0, errors = 0;

    for (let i = 2; i <= ws.rowCount; i++) {
        const row = ws.getRow(i);
        if (!row.hasValues) continue;

        const getCell = (col) => {
            const v = row.getCell(col).value;
            return v !== null && v !== undefined ? String(v).trim() : '';
        };

        const starnumber = getCell(1);
        const landline_number = getCell(2);
        const assigned_user = getCell(3);
        const department = getCell(4);
        const status = getCell(5) || 'Active';
        const notes = getCell(6);

        if (!starnumber) { errors++; console.warn(`Row ${i}: missing star number`); continue; }

        const update = {
            asset_type: 'Landline',
            starnumber,
            landline_number: landline_number || undefined,
            assigned_user: assigned_user || undefined,
            department: department || undefined,
            status,
            notes: notes || undefined,
            branch: 'Chennai',
        };

        try {
            await CA.findOneAndUpdate(
                { starnumber, asset_type: 'Landline' },
                { $set: update },
                { upsert: true, new: true, runValidators: false }
            );
            upserted++;
        } catch (err) {
            console.error(`Row ${i} (${starnumber}) error:`, err.message);
            errors++;
        }
    }

    console.log('\n--- Upsert Import Complete ---');
    console.log('Upserted (inserted or updated) :', upserted);
    console.log('Errors                          :', errors);
    console.log('Total processed                 :', upserted + errors);
    await conn.close();
}

run().catch(err => { console.error(err); process.exit(1); });
