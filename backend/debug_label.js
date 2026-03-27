const mongoose = require('mongoose');
const { Branch } = require('./src/config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function debugLabel() {
    const db = require('./src/config/db');
    await db.connectDB();
    const Branch = db.Branch;
    const branch = await Branch.findOne({ name: 'Chennai' });

    const branchDbURI = `mongodb://localhost:27017/${branch.db_name}`;
    const branchConnection = await mongoose.createConnection(branchDbURI).asPromise();

    const AssetSchema = require('./src/models/Asset').schema;
    const Asset = branchConnection.model('Asset', AssetSchema);

    const asset = await Asset.findOne({ asset_id: /GEM-CHN-IT/i }).sort({ createdAt: -1 });
    if (!asset) {
        console.log('No recent asset found with GEM-CHN-IT prefix');
        process.exit(1);
    }

    console.log('Found Asset:', asset.asset_id);

    try {
        const doc = new PDFDocument({ size: [227, 28], margin: 2 });
        const out = fs.createWriteStream('test_label.pdf');
        doc.pipe(out);

        const seqParts = asset.asset_id.split('-');
        const seqStr = seqParts[seqParts.length - 1];
        const seqNum = parseInt(seqStr) || 1;
        const paddedSeq = seqNum.toString().padStart(4, '0');

        const fullText = `GEM/CHN/IT/SYS/${paddedSeq}`;
        console.log('Generating label with text:', fullText);

        // Testing if font exists
        doc.fillColor('#000000').fontSize(12).font('Helvetica-BoldOblique').text(fullText, 32, 10);

        doc.end();
        console.log('PDF generated successfully: test_label.pdf');
    } catch (err) {
        console.error('Error generating PDF:', err);
    }

    mongoose.disconnect();
}

debugLabel();
