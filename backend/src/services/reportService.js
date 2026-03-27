const ExcelJS = require('exceljs');

/**
 * Generate Asset Inventory Excel report
 */
exports.generateAssetExcel = async (models, filters = {}) => {
    const { Asset } = models;
    const query = {};

    // Status filtering logic
    if (filters.status) {
        if (filters.status === 'Scrap') {
            query.status = { $in: ['Retired', 'Scrapped'] };
        } else if (filters.status === 'Live') {
            query.status = { $in: ['Active', 'Offline', 'Under Maintenance'] };
        } else if (filters.status === 'None') {
            // Include everything (Full Register)
        } else {
            query.status = filters.status;
        }
    } else {
        // Default: exclude Retired/Scrapped if no status specified
        query.status = { $nin: ['Retired', 'Scrapped'] };
    }

    if (filters.department) query.department = filters.department;
    if (filters.asset_type) query.asset_type = filters.asset_type;

    const assets = await Asset.find(query).sort({ department: 1, asset_id: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GEM Hospital IT System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Asset Inventory');

    // Styled header row
    sheet.columns = [
        { header: 'Asset ID', key: 'asset_id', width: 20 },
        { header: 'Type', key: 'asset_type', width: 16 },
        { header: 'Hostname', key: 'hostname', width: 18 },
        { header: 'MAC Address', key: 'mac_address', width: 20 },
        { header: 'IP Address', key: 'ip_address', width: 16 },
        { header: 'Department', key: 'department', width: 14 },
        { header: 'Floor', key: 'location', width: 16 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'OS', key: 'os', width: 18 },
        { header: 'CPU', key: 'cpu', width: 18 },
        { header: 'RAM', key: 'ram', width: 10 },
        { header: 'Warranty End', key: 'warranty_end', width: 14 },
        { header: 'Vendor', key: 'vendor', width: 18 },
        { header: 'Purchase Date', key: 'purchase_date', width: 14 },
    ];

    // Header styling
    sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1D4ED8' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { bottom: { style: 'thin' } };
    });

    assets.forEach((a) => {
        sheet.addRow({
            asset_id: a.asset_id,
            asset_type: a.asset_type,
            hostname: a.hostname || '-',
            mac_address: a.mac_address,
            ip_address: a.ip_address || '-',
            department: a.department,
            location: a.location || '-',
            status: a.status,
            os: a.specs?.os || '-',
            cpu: a.specs?.cpu || '-',
            ram: a.specs?.ram || '-',
            warranty_end: a.warranty_end ? new Date(a.warranty_end).toLocaleDateString() : '-',
            vendor: a.vendor || '-',
            purchase_date: a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : '-',
        });
    });

    // Alternate row shading
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && rowNumber % 2 === 0) {
            row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
            });
        }
    });

    return workbook;
};

/**
 * Generate License Report Excel
 */
exports.generateLicenseExcel = async (models) => {
    const { SoftwareLicense } = models;
    const licenses = await SoftwareLicense.find().sort({ expiry_date: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Software Licenses');

    sheet.columns = [
        { header: 'Software', key: 'software_name', width: 24 },
        { header: 'Vendor', key: 'vendor', width: 20 },
        { header: 'License Type', key: 'license_type', width: 16 },
        { header: 'Seats Purchased', key: 'seats_purchased', width: 16 },
        { header: 'Seats Used', key: 'seats_used', width: 12 },
        { header: 'Expiry Date', key: 'expiry_date', width: 14 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Department', key: 'department', width: 14 },
    ];

    sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '065F46' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
    });

    licenses.forEach((l) => {
        sheet.addRow({
            software_name: l.software_name,
            vendor: l.vendor || '-',
            license_type: l.license_type,
            seats_purchased: l.seats_purchased,
            seats_used: l.seats_used,
            expiry_date: l.expiry_date ? new Date(l.expiry_date).toLocaleDateString() : 'No Expiry',
            status: l.status,
            department: l.department || '-',
        });
    });

    return workbook;
};

/**
 * Generate PM Register Report Excel
 */
exports.generatePMExcel = async (models) => {
    const { PMSchedule, Asset, PMRecord } = models;
    // 1. Get active policies
    const policies = await PMSchedule.find({ status: 'Active' })
        .populate('template_id', 'name');

    // 2. We only care about assets that are active/live
    const liveStatuses = ['Active', 'Offline', 'Under Maintenance', 'In Stock'];
    let allTasks = [];

    // 3. For each policy, find matching assets and calculate their individual due dates
    for (const policy of policies) {
        const matchingAssets = await Asset.find({
            asset_type: policy.asset_type,
            status: { $in: liveStatuses }
        }).select('asset_id');

        for (const asset of matchingAssets) {
            const lastRecord = await PMRecord.findOne({
                asset_id: asset.asset_id,
                schedule_id: policy._id
            }).sort({ completed_date: -1 });

            const baseDate = lastRecord ? lastRecord.completed_date : policy.start_date;
            const nextDate = new Date(baseDate);

            switch (policy.frequency) {
                case 'Monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                case 'Quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
                case 'Half-Yearly': nextDate.setMonth(nextDate.getMonth() + 6); break;
                case 'Yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
            }

            allTasks.push({
                asset_id: asset.asset_id,
                template: policy.template_id?.name || '-',
                frequency: policy.frequency,
                last_done: lastRecord ? new Date(lastRecord.completed_date).toLocaleDateString() : 'Never',
                next_due: nextDate,
                plan_status: policy.status
            });
        }
    }

    allTasks.sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('PM Register');

    sheet.columns = [
        { header: 'Asset ID', key: 'asset_id', width: 20 },
        { header: 'PM Template', key: 'template', width: 20 },
        { header: 'Frequency', key: 'frequency', width: 14 },
        { header: 'Last PM Date', key: 'last_done', width: 14 },
        { header: 'Next PM Due', key: 'next_due', width: 14 },
        { header: 'Status', key: 'status', width: 14 },
    ];

    sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7C3AED' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
    });

    allTasks.forEach(task => {
        const now = new Date();
        const due = new Date(task.next_due);
        let status = 'Upcoming';
        if (due < now) status = 'OVERDUE';
        else if ((due - now) / (1000 * 60 * 60 * 24) <= 7) status = 'Due Soon';

        sheet.addRow({
            asset_id: task.asset_id,
            template: task.template,
            frequency: task.frequency,
            last_done: task.last_done,
            next_due: due.toLocaleDateString(),
            status,
        });
    });

    return workbook;
};

/**
 * Generate Individual Asset PM History Card (PDF)
 * NABH Compliant record of all maintenance for one specific asset
 */
exports.generatePMHistoryCard = async (models, assetId) => {
    const PDFDocument = require('pdfkit');
    const { Asset, PMRecord } = models;

    const asset = await Asset.findOne({ asset_id: assetId.toUpperCase() });
    if (!asset) throw new Error('Asset not found');

    const records = await PMRecord.find({ asset_id: assetId.toUpperCase() })
        .populate('schedule_id', 'frequency')
        .sort({ completed_date: -1 });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Header
    doc.fontSize(18).fillColor('#4338CA').text('GEM HOSPITAL', { align: 'center' });
    doc.fontSize(12).fillColor('#333').text('PREVENTIVE MAINTENANCE HISTORY CARD', { align: 'center' });
    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#4338CA').lineWidth(1).stroke();
    doc.moveDown();

    // Asset Info Section
    doc.fillColor('#1F2937').fontSize(10).font('Helvetica-Bold').text('ASSET INFORMATION');
    doc.font('Helvetica').fontSize(9).moveDown(0.5);

    const infoX1 = 40, infoX2 = 200, infoX3 = 350;
    let currY = doc.y;

    doc.text(`Asset ID: ${asset.asset_id}`, infoX1, currY);
    doc.text(`Type: ${asset.asset_type}`, infoX2, currY);
    doc.text(`Department: ${asset.department}`, infoX3, currY);

    currY += 15;
    doc.text(`Hostname: ${asset.hostname || '-'}`, infoX1, currY);
    doc.text(`Floor: ${asset.location || '-'}`, infoX2, currY);
    doc.text(`Status: ${asset.status}`, infoX3, currY);

    doc.moveDown(2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    doc.moveDown();

    // Records Table
    doc.fillColor('#1F2937').fontSize(10).font('Helvetica-Bold').text('MAINTENANCE LOG');
    doc.moveDown(0.5);

    const headers = ['Date', 'Engineer', 'Remarks', 'Checklist'];
    const colWidths = [80, 100, 200, 135];
    let startX = 40;
    const tableHeaderY = doc.y;

    doc.rect(40, tableHeaderY, 515, 16).fill('#4338CA');
    doc.fillColor('#FFFFFF').fontSize(8);
    headers.forEach((h, i) => {
        doc.text(h, startX + 2, tableHeaderY + 4);
        startX += colWidths[i];
    });

    let rowY = tableHeaderY + 16;
    doc.fillColor('#333');

    if (records.length === 0) {
        doc.text('No maintenance records found.', 40, rowY + 10, { align: 'center', width: 515 });
    } else {
        records.forEach((r, idx) => {
            if (rowY > 700) {
                doc.addPage();
                rowY = 40;
            }

            const rowColor = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
            doc.rect(40, rowY, 515, 24).fill(rowColor);

            doc.fillColor('#111').fontSize(7);
            doc.text(new Date(r.completed_date).toLocaleDateString(), 42, rowY + 8);
            doc.text(r.engineer_name, 40 + colWidths[0] + 2, rowY + 8, { width: colWidths[1] - 4 });
            doc.text(r.remarks || '-', 40 + colWidths[0] + colWidths[1] + 2, rowY + 8, { width: colWidths[2] - 4 });

            const tasksTotal = r.checklist_results?.length || 0;
            const tasksPassed = r.checklist_results?.filter(t => t.status)?.length || 0;
            doc.text(`${tasksPassed}/${tasksTotal} Tasks Passed`, 40 + colWidths[0] + colWidths[1] + colWidths[2] + 2, rowY + 8);

            rowY += 24;
        });
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#9CA3AF').text(`Generated on ${new Date().toLocaleString()} | NABH Compliance Document`, { align: 'center' });

    doc.end();
    return doc;
};
/**
 * Generate Global PM History Report (PDF)
 * Consolidated record of all maintenance across the branch
 */
exports.generateGlobalPMHistoryPDF = async (models, filters = {}) => {
    const PDFDocument = require('pdfkit');
    const { PMRecord } = models;

    const query = {};
    if (filters.asset_id) query.asset_id = new RegExp(filters.asset_id, 'i');
    if (filters.engineer) query.engineer_name = new RegExp(filters.engineer, 'i');
    if (filters.frequency) query['schedule_id.frequency'] = filters.frequency;

    if (filters.from || filters.to) {
        query.completed_date = {};
        if (filters.from) query.completed_date.$gte = new Date(filters.from);
        if (filters.to) {
            const end = new Date(filters.to);
            end.setHours(23, 59, 59, 999);
            query.completed_date.$lte = end;
        }
    }

    const records = await PMRecord.find(query)
        .populate({
            path: 'schedule_id',
            populate: { path: 'template_id', select: 'name' }
        })
        .sort({ completed_date: -1 })
        .limit(1000); // Sanity limit for PDF

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Header
    doc.fontSize(18).fillColor('#4338CA').text('GEM HOSPITAL', { align: 'center' });
    doc.fontSize(12).fillColor('#333').text('GLOBAL PREVENTIVE MAINTENANCE LOG', { align: 'center' });
    doc.fontSize(8).fillColor('#666').text(`Filter: ${filters.from || 'Start'} to ${filters.to || 'Now'}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#4338CA').lineWidth(1).stroke();
    doc.moveDown();

    // Table Headers
    const headers = ['Date', 'Asset ID', 'Template', 'Engineer', 'Result'];
    const colWidths = [80, 80, 140, 115, 100];
    let startX = 40;
    const tableHeaderY = doc.y;

    doc.rect(40, tableHeaderY, 515, 16).fill('#4338CA');
    doc.fillColor('#FFFFFF').fontSize(8);
    headers.forEach((h, i) => {
        doc.text(h, startX + 2, tableHeaderY + 4);
        startX += colWidths[i];
    });

    let rowY = tableHeaderY + 16;
    doc.fillColor('#333');

    records.forEach((r, idx) => {
        if (rowY > 750) {
            doc.addPage();
            rowY = 40;
        }

        const rowColor = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        doc.rect(40, rowY, 515, 20).fill(rowColor);

        doc.fillColor('#111').fontSize(7);
        doc.text(new Date(r.completed_date).toLocaleDateString(), 42, rowY + 6);
        doc.text(r.asset_id, 40 + colWidths[0] + 2, rowY + 6);
        doc.text(r.schedule_id?.template_id?.name || 'N/A', 40 + colWidths[0] + colWidths[1] + 2, rowY + 6, { width: colWidths[2] - 4 });
        doc.text(r.engineer_name, 40 + colWidths[0] + colWidths[1] + colWidths[2] + 2, rowY + 6, { width: colWidths[3] - 4 });

        const tasksTotal = r.checklist_results?.length || 0;
        const tasksPassed = r.checklist_results?.filter(t => t.status)?.length || 0;
        doc.text(tasksTotal > 0 ? `${tasksPassed}/${tasksTotal} Passed` : 'Completed', 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, rowY + 6);

        rowY += 20;
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#9CA3AF').text(`Generated on ${new Date().toLocaleString()} | Branch: Global | Records: ${records.length}`, { align: 'center' });

    doc.end();
    return doc;
};
