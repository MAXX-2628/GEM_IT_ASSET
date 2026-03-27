const ExcelJS = require('exceljs');
const path = require('path');

async function dumpExcel() {
    const filePath = 'e:/Project IT/IT Asset/Switch.xlsx';
    const workbook = new ExcelJS.Workbook();
    const workbookSource = new ExcelJS.Workbook();
    try {
        await workbookSource.xlsx.readFile(filePath);
        const worksheet = workbookSource.getWorksheet(1);

        console.log('--- HEADERS ---');
        const headers = [];
        worksheet.getRow(1).eachCell((cell) => {
            headers.push(cell.value);
        });
        console.log(headers.join(' | '));

        console.log('\n--- ROWS (Top 5) ---');
        const rowCount = Math.min(6, worksheet.rowCount);
        for (let i = 2; i <= rowCount; i++) {
            const row = worksheet.getRow(i);
            const values = [];
            row.eachCell({ includeEmpty: true }, (cell) => {
                values.push(cell.value);
            });
            console.log(values.join(' | '));
        }
    } catch (err) {
        console.error('Error reading Excel:', err.message);
    }
}

dumpExcel();
