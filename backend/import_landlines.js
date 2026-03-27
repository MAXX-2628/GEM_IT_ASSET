require('dotenv').config();
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { schema: CommSchema } = require('./src/models/CommunicationAsset');

async function run() {
    const uri = process.env.MONGODB_URI;
    const baseUri = uri.split('?')[0];
    const parts = baseUri.split('/');
    parts[parts.length - 1] = 'gem_itasset_chn';
    const branchUri = parts.join('/') + (uri.includes('?') ? '?' + uri.split('?')[1] : '');

    const conn = await mongoose.createConnection(branchUri).asPromise();
    const CommunicationAsset = conn.model('CommunicationAsset', CommSchema);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../Star Number.xlsx');
    const ws = wb.getWorksheet(1);

    let inserted = 0, skipped = 0, errors = 0;

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

        // Skip if star number or external number already exists
        const existingStar = await CommunicationAsset.findOne({ starnumber, asset_type: 'Landline' });
        if (existingStar) { skipped++; continue; }

        if (landline_number) {
            const existingNum = await CommunicationAsset.findOne({ landline_number, asset_type: 'Landline' });
            if (existingNum) { skipped++; continue; }
        }

        try {
            await CommunicationAsset.create({
                asset_type: 'Landline',
                starnumber,
                landline_number: landline_number || undefined,
                assigned_user: assigned_user || undefined,
                department: department || undefined,
                status,
                notes: notes || undefined,
                branch: 'Chennai'
            });
            inserted++;
        } catch (err) {
            console.error(`Row ${i} error:`, err.message);
            errors++;
        }
    }

    console.log('\n--- Import Complete ---');
    console.log('Inserted :', inserted);
    console.log('Skipped  :', skipped, '(duplicates)');
    console.log('Errors   :', errors);
    console.log('Total    :', inserted + skipped + errors);
    await conn.close();
}

run().catch(err => { console.error(err); process.exit(1); });
