const ExcelJS = require('exceljs');
const path = require('path');

async function analyze() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../Survilence.xlsx'));

    const worksheet = workbook.getWorksheet(1);
    const headers = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        if (cell.value) headers[cell.value.toString().trim().toLowerCase()] = colNumber;
    });

    let totalRows = 0;
    const ips = new Set();
    const serials = new Set();

    let dupIps = 0;
    let dupSerials = 0;
    let emptyIpAndSerial = 0;

    for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row.hasValues) continue;

        totalRows++;

        const ipCol = headers['ip address'];
        const snCol = headers['serial number'];

        const ip = ipCol ? row.getCell(ipCol).value?.toString()?.trim() : null;
        const sn = snCol ? row.getCell(snCol).value?.toString()?.trim() : null;

        let isDup = false;
        if (ip) {
            if (ips.has(ip)) {
                dupIps++;
                isDup = true;
            } else {
                ips.add(ip);
            }
        }

        if (sn && !isDup) { // Avoid double counting if both are dup
            if (serials.has(sn)) {
                dupSerials++;
                isDup = true;
            } else {
                serials.add(sn);
            }
        }

        if (!ip && !sn) {
            emptyIpAndSerial++;
        }
    }

    console.log({ totalRows, dupIps, dupSerials, emptyIpAndSerial, uniqueProcessed: totalRows - dupIps - dupSerials });
}

analyze().catch(console.error);
