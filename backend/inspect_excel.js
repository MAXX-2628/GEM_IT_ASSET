const ExcelJS = require('exceljs');
const path = require('path');

async function inspectExcel() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, '..', 'asset pc.xlsx');

    try {
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);

        console.log(`Worksheet: ${worksheet.name}`);

        const headerRow = worksheet.getRow(1);
        const headers = [];
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            headers.push({ col: colNumber, label: cell.value });
        });

        console.log('Headers:', JSON.stringify(headers, null, 2));

        console.log('\nFirst 5 rows of data:');
        for (let i = 2; i <= 6; i++) {
            const row = worksheet.getRow(i);
            const rowData = {};
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const header = headers.find(h => h.col === colNumber);
                rowData[header ? header.label : `Col${colNumber}`] = cell.value;
            });
            console.log(`Row ${i}:`, JSON.stringify(rowData, null, 2));
        }
    } catch (error) {
        console.error('Error reading excel file:', error);
    }
}

inspectExcel();
