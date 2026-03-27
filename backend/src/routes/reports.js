const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const reportService = require('../services/reportService');
const { Branch } = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @GET /api/reports/assets/excel
router.get('/assets/excel', verifyToken, async (req, res) => {
    if (!req.models) return res.status(400).json({ success: false, message: 'Branch context missing' });
    try {
        const workbook = await reportService.generateAssetExcel(req.models, req.query);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="GEM_Asset_Report_${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('[ERROR] Asset Excel:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate Excel report' });
        }
    }
});

// @GET /api/reports/licenses/excel
router.get('/licenses/excel', verifyToken, async (req, res) => {
    if (!req.models) return res.status(400).json({ success: false, message: 'Branch context missing' });
    try {
        const workbook = await reportService.generateLicenseExcel(req.models);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="GEM_License_Report_${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate license report' });
        }
    }
});

// @GET /api/reports/pm/register
router.get('/pm/register', verifyToken, async (req, res) => {
    if (!req.models) return res.status(400).json({ success: false, message: 'Branch context missing' });
    try {
        const workbook = await reportService.generatePMExcel(req.models);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="GEM_PM_Register_${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate PM register' });
        }
    }
});

// @GET /api/reports/pm/history  -- Consolidated branch history
router.get('/pm/history', verifyToken, async (req, res) => {
    if (!req.models) return res.status(400).json({ success: false, message: 'Branch context missing' });
    try {
        const doc = await reportService.generateGlobalPMHistoryPDF(req.models, req.query);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="PM_Global_History_${Date.now()}.pdf"`);
        doc.pipe(res);
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate Global PM report' });
        }
    }
});

// @GET /api/reports/pm/history/:assetId
router.get('/pm/history/:assetId', verifyToken, async (req, res) => {
    if (!req.models) return res.status(400).json({ success: false, message: 'Branch context missing' });
    try {
        const doc = await reportService.generatePMHistoryCard(req.models, req.params.assetId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="PM_History_${req.params.assetId}.pdf"`);
        doc.pipe(res);
    } catch (err) {
        if (!res.headersSent) {
            res.status(404).json({ success: false, message: err.message });
        }
    }
});

// @GET /api/reports/assets/pdf — NABH compliant PDF
router.get('/assets/pdf', verifyToken, async (req, res) => {
    if (!req.models) return res.status(400).json({ success: false, message: 'Branch context missing' });
    try {
        const { Asset } = req.models;
        const query = {};

        if (req.query.status) {
            if (req.query.status === 'Scrap') {
                query.status = { $in: ['Retired', 'Scrapped'] };
            } else if (req.query.status === 'Live') {
                query.status = { $in: ['Active', 'Offline', 'Under Maintenance'] };
            } else if (req.query.status === 'None') {
                delete query.status;
            } else {
                query.status = req.query.status;
            }
        } else {
            query.status = { $nin: ['Retired', 'Scrapped'] };
        }

        if (req.query.department) query.department = req.query.department;
        if (req.query.asset_type) query.asset_type = req.query.asset_type;

        const assets = await Asset.find(query).sort({ department: 1 });

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="GEM_Asset_NABH_Report_${Date.now()}.pdf"`);
        doc.pipe(res);

        // Header
        doc.fontSize(18).fillColor('#1D4ED8').text('GEM HOSPITAL', { align: 'center' });
        doc.fontSize(12).fillColor('#333').text('IT Asset Inventory Register', { align: 'center' });
        doc.fontSize(9).fillColor('#666').text(`Report Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#1D4ED8').lineWidth(1).stroke();
        doc.moveDown();

        // Table headers
        const headers = ['Asset ID', 'Type', 'Hostname', 'Department', 'Status', 'Warranty End'];
        const colWidths = [100, 70, 100, 80, 70, 95];
        let x = 40;
        const headerY = doc.y;

        doc.rect(40, headerY, 515, 16).fill('#1D4ED8');
        doc.fillColor('#FFFFFF').fontSize(8);
        headers.forEach((h, i) => {
            doc.text(h, x + 2, headerY + 4, { width: colWidths[i], ellipsis: true });
            x += colWidths[i];
        });
        doc.fillColor('#333');

        let rowY = headerY + 16;
        assets.forEach((a, idx) => {
            if (rowY > 750) {
                doc.addPage();
                rowY = 40;
            }
            const rowColor = idx % 2 === 0 ? '#EFF6FF' : '#FFFFFF';
            doc.rect(40, rowY, 515, 14).fill(rowColor);

            const row = [
                a.asset_id,
                a.asset_type,
                a.hostname || '-',
                a.department,
                a.status,
                a.warranty_end ? new Date(a.warranty_end).toLocaleDateString() : '-',
            ];
            x = 40;
            doc.fontSize(7).fillColor('#222');
            row.forEach((val, i) => {
                doc.text(String(val), x + 2, rowY + 3, { width: colWidths[i] - 4, ellipsis: true });
                x += colWidths[i];
            });
            rowY += 14;
        });

        // Footer
        doc.moveDown(2);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#999').stroke();
        doc.fontSize(8).fillColor('#666').text(
            `Total Assets: ${assets.length}   |   GEM Hospital IT Dept   |   NABH Audit Ready`,
            { align: 'center' }
        );
        doc.moveDown(0.5);
        doc.text('Authorized Signature: _______________________    IT Admin: _______________________', { align: 'center' });

        doc.end();
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
        }
    }
});

// @GET /api/reports/assets/bulk-labels
// IMPORTANT: bulk-labels must be placed BEFORE :id/label to avoid incorrect parameter matching
router.get('/assets/bulk-labels', verifyToken, async (req, res) => {
    if (!req.models) return res.status(400).json({ success: false, message: 'Branch context missing' });
    try {
        const { Asset, AssetType } = req.models;
        const query = {};
        if (req.query.status) query.status = req.query.status;
        else query.status = { $nin: ['Retired', 'Scrapped'] };

        if (req.query.department) query.department = req.query.department;
        if (req.query.asset_type) query.asset_type = req.query.asset_type;

        const assets = await Asset.find(query).sort({ asset_id: 1 });
        if (assets.length === 0) return res.status(404).json({ success: false, message: 'No assets found.' });

        const doc = new PDFDocument({ size: 'A4', margin: 20 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Bulk_Labels_${Date.now()}.pdf"`);
        doc.pipe(res);

        const labelW = 227, labelH = 28, cols = 2, rowsPerPage = 24, marginX = 20, marginY = 30, gapX = 15, gapY = 2;
        let count = 0;

        const allTypes = await AssetType.find({});
        const locCode = req.branchCode || 'CHN';

        // Robust Logo Path
        const logoPath = path.resolve(__dirname, '../../../frontend/public/logo.png');
        const hasLogo = fs.existsSync(logoPath);

        for (const asset of assets) {
            if (count > 0 && count % (cols * rowsPerPage) === 0) doc.addPage();

            const pageIdx = count % (cols * rowsPerPage);
            const col = pageIdx % cols, row = Math.floor(pageIdx / cols);
            const x = marginX + (col * (labelW + gapX)), y = marginY + (row * (labelH + gapY));

            doc.rect(x, y, labelW, labelH).strokeColor('#EEEEEE').lineWidth(0.5).stroke();

            if (hasLogo) {
                doc.image(logoPath, x + 4, y + 3, { width: 22, height: 22 });
            } else {
                doc.circle(x + 15, y + 14, 9).fill('#1D4ED8');
                doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('G', x + 11, y + 10);
            }

            const typeObj = allTypes.find(t => t.name === asset.asset_type);
            const typeCode = typeObj?.code || (asset.asset_type ? asset.asset_type.substring(0, 3).toUpperCase() : 'AST');

            // Parse the sequence number to integer, then zero-pad to 4 digits
            const seqParts = (asset.asset_id || '').split('-');
            const seqStr = seqParts[seqParts.length - 1]; // e.g. "01" or "0001"
            const seqNum = parseInt(seqStr) || 1;
            const paddedSeq = seqNum.toString().padStart(4, '0');

            // GEM/BranchCode/IT/AssetType/0001
            const fullText = `GEM/${locCode}/IT/${typeCode}/${paddedSeq}`;

            // Centering logic:
            // Vertically center logo: (28 - 22) / 2 = 3. Already y + 3.
            // Vertically center text: Size 12 text is roughly 12-14 units. (28 - 12) / 2 = 8.
            // Horizontally center text across the label width, keeping logo visible.
            doc.fillColor('#000000').fontSize(12).font('Helvetica-BoldOblique').text(fullText, x, y + 9, {
                width: labelW,
                align: 'center'
            });

            count++;
        }

        doc.end();
    } catch (err) {
        console.error('[ERROR] Bulk Labels:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate bulk labels' });
        }
    }
});

// @GET /api/reports/assets/:id/label — QR Label PDF
router.get('/assets/:id/label', verifyToken, async (req, res) => {
    if (!req.models) return res.status(400).json({ success: false, message: 'Branch context missing' });
    try {
        const { Asset, AssetType } = req.models;
        const asset = await Asset.findOne({ asset_id: req.params.id.toUpperCase() });
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

        const doc = new PDFDocument({ size: [227, 28], margin: 2 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="label_${asset.asset_id}.pdf"`);
        doc.pipe(res);

        const logoPath = path.resolve(__dirname, '../../../frontend/public/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 4, 3, { width: 22, height: 22 });
        } else {
            doc.circle(15, 14, 9).fill('#1D4ED8');
            doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('G', 11, 10);
        }

        const typeObj = await AssetType.findOne({ name: asset.asset_type });
        const typeCode = typeObj?.code || (asset.asset_type ? asset.asset_type.substring(0, 3).toUpperCase() : 'AST');

        const locCode = req.branchCode || 'CHN';

        // Parse the sequence number to integer, then zero-pad to 4 digits
        const seqParts = (asset.asset_id || '').split('-');
        const seqStr = seqParts[seqParts.length - 1];
        const seqNum = parseInt(seqStr) || 1;
        const paddedSeq = seqNum.toString().padStart(4, '0');

        // Text format
        const fullText = `GEM/${locCode}/IT/${typeCode}/${paddedSeq}`;

        // Centering logic for single label (Width 227)
        doc.fillColor('#000000').fontSize(12).font('Helvetica-BoldOblique').text(fullText, 0, 9, {
            width: 227,
            align: 'center'
        });

        doc.end();
    } catch (err) {
        console.error('[ERROR] Single Label:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate asset label' });
        }
    }
});

module.exports = router;
