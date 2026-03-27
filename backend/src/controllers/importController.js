const ExcelJS = require('exceljs');
const { generateNextAssetId } = require('../utils/idGenerator');
const logActivity = require('../utils/activityLogger');

const getCellValue = (row, headers, headerName) => {
    const colIndex = headers[headerName.toLowerCase()];
    if (!colIndex) return null;
    const cell = row.getCell(colIndex);
    let value = cell.value;

    // Handle Formula result
    if (value && typeof value === 'object' && value.result !== undefined) {
        value = value.result;
    }

    // Handle complex ExcelJS objects (Hyperlinks, Rich Text)
    if (value && typeof value === 'object') {
        if (value.text) return value.text; // Hyperlink
        if (value.richText) return value.richText.map(t => t.text).join(''); // Rich Text
        // Fallback for any other objects to avoid [object object]
        return value.toString();
    }

    return value;
};

const normalizeStatus = (status, defaultStatus = 'Active') => {
    if (!status) return defaultStatus;
    const s = status.toString().trim().toLowerCase();
    if (s === 'live' || s === 'active') return 'Active';
    if (s === 'stock' || s === 'in stock') return 'In Stock';
    if (s === 'scrap' || s === 'scrapped') return 'Scrapped';
    if (s === 'expired') return 'Expired';
    if (s === 'suspended') return 'Suspended';
    if (s === 'deactivated') return 'Deactivated';
    return s.charAt(0).toUpperCase() + s.slice(1);
};

// --- PREVIEW ASSETS ---
exports.previewAssets = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const { Asset, AssetType, Department } = req.models;
    const { branchName } = req;

    try {
        const workbook = new ExcelJS.Workbook();
        if (req.file.originalname.endsWith('.csv')) {
            await workbook.csv.load(req.file.buffer);
        } else {
            await workbook.xlsx.load(req.file.buffer);
        }

        const worksheet = workbook.getWorksheet(1);
        const headers = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) headers[cell.value.toString().trim().toLowerCase()] = colNumber;
        });

        const defaultStatus = req.headers['x-default-status'] || 'In Stock';
        const previewRows = [];
        const summary = { total: 0, valid: 0, warnings: 0, errors: 0 };

        // Fetch valid types and departments for validation
        const [assetTypes, departments] = await Promise.all([
            AssetType.find({ active: true }).lean(),
            Department.find({}).lean()
        ]);
        const typeNames = assetTypes.map(t => t.name.toLowerCase());
        const deptNames = departments.map(d => d.name.toLowerCase());

        const duplicateMode = req.headers['x-duplicate-mode'] || 'skip';
        const isSkipOrUpdate = ['skip', 'update'].includes(duplicateMode);

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            if (!row.hasValues) continue;

            summary.total++;
            const rowData = {
                mac_address: getCellValue(row, headers, 'MAC Address')?.toString().trim().toUpperCase(),
                asset_type: getCellValue(row, headers, 'Asset Type')?.toString().trim(),
                department: getCellValue(row, headers, 'Department')?.toString().trim(),
                hostname: getCellValue(row, headers, 'Hostname')?.toString().trim(),
                ip_address: getCellValue(row, headers, 'IP Address')?.toString().trim(),
                asset_id: getCellValue(row, headers, 'Asset ID')?.toString().trim(),
                status: normalizeStatus(getCellValue(row, headers, 'Status'), defaultStatus),
                location: (getCellValue(row, headers, 'Floor / Location') || getCellValue(row, headers, 'Location'))?.toString().trim(),
                sub_category: getCellValue(row, headers, 'Sub-Category')?.toString().trim(),
                username: getCellValue(row, headers, 'Username')?.toString().trim(),
                password: getCellValue(row, headers, 'Password')?.toString().trim(),
                vendor: getCellValue(row, headers, 'Vendor')?.toString().trim(),
                purchase_date: getCellValue(row, headers, 'Purchase Date')?.toString().trim(),
                warranty_end: getCellValue(row, headers, 'Warranty End')?.toString().trim(),
                notes: getCellValue(row, headers, 'Notes')?.toString().trim(),
                os: getCellValue(row, headers, 'OS')?.toString().trim(),
                model: getCellValue(row, headers, 'Model')?.toString().trim(),
                serial_number: getCellValue(row, headers, 'Serial Number')?.toString().trim(),
            };

            const rowErrors = [];
            const rowWarnings = [];

            // Mandatory Fields Verification
            if (!rowData.asset_id) rowErrors.push('Missing Asset ID');
            if (!rowData.asset_type) rowErrors.push('Missing Asset Type');
            else if (!typeNames.includes(rowData.asset_type.toLowerCase())) rowErrors.push(`Unknown Type: ${rowData.asset_type}`);

            if (!rowData.mac_address) rowErrors.push('Missing MAC Address');
            if (!rowData.ip_address) rowErrors.push('Missing IP Address');

            // Optional but good to have
            if (rowData.department && !deptNames.includes(rowData.department.toLowerCase())) {
                rowWarnings.push(`Unknown Dept: ${rowData.department}`);
            }

            // Duplicate Verification
            if (rowData.asset_id && rowData.asset_type) {
                const dupId = await Asset.findOne({
                    asset_id: rowData.asset_id.toUpperCase(),
                    asset_type: rowData.asset_type
                });
                if (dupId) {
                    const msg = `Duplicate ID: ${rowData.asset_id} already exists for type ${rowData.asset_type}`;
                    if (isSkipOrUpdate) rowWarnings.push(msg); else rowErrors.push(msg);
                }
            }
            if (rowData.mac_address && rowData.mac_address.trim()) {
                const dupMac = await Asset.findOne({ mac_address: rowData.mac_address.trim() });
                if (dupMac) {
                    const msg = `Duplicate MAC: ${rowData.mac_address} exists as ${dupMac.asset_id}`;
                    if (isSkipOrUpdate) rowWarnings.push(msg); else rowErrors.push(msg);
                }
            }
            if (rowData.ip_address && rowData.ip_address.trim()) {
                const dupIp = await Asset.findOne({ ip_address: rowData.ip_address.trim() });
                if (dupIp) {
                    const msg = `Duplicate IP: ${rowData.ip_address} exists as ${dupIp.asset_id}`;
                    if (isSkipOrUpdate) rowWarnings.push(msg); else rowErrors.push(msg);
                }
            }

            let status = 'valid';
            if (rowErrors.length > 0) {
                status = 'error';
                summary.errors++;
            } else if (rowWarnings.length > 0) {
                status = 'warning';
                summary.warnings++;
            } else {
                summary.valid++;
            }

            previewRows.push({
                rowNumber: i,
                data: rowData,
                status,
                errors: rowErrors,
                warnings: rowWarnings,
                raw: row.values
            });
        }

        res.json({ success: true, data: { rows: previewRows, summary } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Parse failed: ' + err.message });
    }
};

// --- CONFIRM ASSET IMPORT ---
exports.confirmAssetImport = async (req, res) => {
    const { rows, duplicateMode } = req.body;
    if (!rows || !Array.isArray(rows)) return res.status(400).json({ success: false, message: 'Invalid data' });

    const { Asset, AssetType, ImportBatch } = req.models;
    const branchCode = req.branchCode || 'CHN';
    const branchName = req.branchName || 'Chennai';

    const batchId = `IMP-AST-${Date.now()}`;
    const batch = new ImportBatch({
        batch_id: batchId,
        module: 'Assets',
        file_name: req.body.fileName || 'unknown',
        imported_by: req.user.name || 'System',
        branch: branchName,
        duplicate_mode: duplicateMode || 'skip'
    });

    let success = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
        if (row.status === 'error') {
            failed++;
            batch.errors.push({
                row: row.rowNumber,
                error_type: 'Validation',
                message: row.errors.join(', '),
                raw_data: row.data
            });
            continue;
        }

        try {
            const assetData = { ...row.data, branch: req.branchName, batch_id: batchId };

            // Map credentials to the correct structure (array of objects)
            if (assetData.username || assetData.password) {
                assetData.credentials = [{
                    label: 'Primary',
                    username: assetData.username,
                    password: assetData.password
                }];
            }
            delete assetData.username;
            delete assetData.password;

            // Map specs to correct structure
            assetData.specs = {
                os: assetData.os,
                model: assetData.model,
                serial_number: assetData.serial_number
            };
            delete assetData.os;
            delete assetData.model;
            delete assetData.serial_number;

            // Re-check duplicates based on mode (Exclude empty/whitespace fields)
            const dupQuery = [];
            if (assetData.asset_id && assetData.asset_type) {
                dupQuery.push({ asset_id: assetData.asset_id.toUpperCase(), asset_type: assetData.asset_type });
            }
            if (assetData.mac_address && assetData.mac_address.toString().trim()) {
                dupQuery.push({ mac_address: assetData.mac_address.toString().trim() });
            }
            if (assetData.ip_address && assetData.ip_address.toString().trim()) {
                dupQuery.push({ ip_address: assetData.ip_address.toString().trim() });
            }

            let existing = null;
            if (dupQuery.length > 0) {
                existing = await Asset.findOne({ $or: dupQuery });
            }

            if (existing) {
                if (duplicateMode === 'stop') {
                    throw new Error(`Stop on duplicate: ${assetData.mac_address || assetData.asset_id}`);
                } else if (duplicateMode === 'skip') {
                    skipped++;
                    continue;
                } else if (duplicateMode === 'update') {
                    await Asset.findByIdAndUpdate(existing._id, assetData);
                    updated++;
                    continue;
                }
            }

            // Generate ID if missing
            if (!assetData.asset_id) {
                assetData.asset_id = await generateNextAssetId(Asset, AssetType, branchCode, assetData.asset_type, assetData.sub_category);
            }

            await Asset.create(assetData);
            success++;
        } catch (err) {
            failed++;
            batch.errors.push({
                row: row.rowNumber,
                error_type: err.message.includes('duplicate') ? 'Duplicate' : 'System',
                message: err.message,
                raw_data: row.data
            });
            if (duplicateMode === 'stop') break;
        }
    }

    batch.total_records = rows.length;
    batch.success_count = success;
    batch.failed_count = failed;
    batch.skipped_count = skipped;
    batch.status = failed === 0 ? 'completed' : (success + updated > 0 ? 'partial' : 'failed');
    await batch.save();

    await logActivity(req, {
        action: 'IMPORT',
        module: 'Assets',
        target_id: batchId,
        details: `Imported ${success} new, updated ${updated}, skipped ${skipped}, failed ${failed}.`
    });

    res.json({ success: true, data: { batchId, success, updated, skipped, failed, total: rows.length } });
};

// --- DOWNLOAD ERROR REPORT ---
exports.downloadErrorReport = async (req, res) => {
    const { batchId } = req.params;
    const { ImportBatch } = req.models;

    try {
        const batch = await ImportBatch.findOne({ batch_id: batchId });
        if (!batch) return res.status(404).send('Batch not found');

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Import Errors');
        sheet.columns = [
            { header: 'Row No', key: 'row', width: 10 },
            { header: 'Error Type', key: 'error_type', width: 15 },
            { header: 'Message', key: 'message', width: 40 },
            { header: 'Raw Data', key: 'raw_data', width: 50 }
        ];

        batch.errors.forEach(err => {
            sheet.addRow({
                row: err.row,
                error_type: err.error_type,
                message: err.message,
                raw_data: JSON.stringify(err.raw_data)
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Error_Report_${batchId}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).send('Generation failed');
    }
};

// --- TEMPLATES ---
exports.downloadAssetTemplate = async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('IT Assets');
    sheet.columns = [
        { header: 'Asset ID', key: 'asset_id', width: 20 },
        { header: 'Asset Type', key: 'asset_type', width: 20 },
        { header: 'Sub-Category', key: 'sub_category', width: 20 },
        { header: 'Hostname', key: 'hostname', width: 20 },
        { header: 'MAC Address', key: 'mac_address', width: 20 },
        { header: 'IP Address', key: 'ip_address', width: 20 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Floor / Location', key: 'location', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'CPU', key: 'cpu', width: 20 },
        { header: 'RAM', key: 'ram', width: 10 },
        { header: 'Storage', key: 'storage', width: 15 },
        { header: 'Storage Type', key: 'storage_type', width: 15 },
        { header: 'OS', key: 'os', width: 20 },
        { header: 'Model', key: 'model', width: 20 },
        { header: 'Serial Number', key: 'serial_number', width: 20 },
        { header: 'Username', key: 'username', width: 15 },
        { header: 'Password', key: 'password', width: 15 },
        { header: 'Vendor', key: 'vendor', width: 20 },
        { header: 'Purchase Date', key: 'purchase_date', width: 20 },
        { header: 'Warranty End', key: 'warranty_end', width: 20 },
        { header: 'Notes', key: 'notes', width: 30 }
    ];
    sheet.addRow({ asset_type: 'Desktop', hostname: 'GEM-IT-01', mac_address: 'AA:BB:CC:DD:EE:FF', department: 'IT', status: 'In Stock' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Asset_Template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
};

// PREVIEW SURVEILLANCE
exports.previewSurveillance = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    const { SurveillanceAsset } = req.models;
    try {
        const workbook = new ExcelJS.Workbook();
        if (req.file.originalname.endsWith('.csv')) {
            await workbook.csv.load(req.file.buffer);
        } else {
            await workbook.xlsx.load(req.file.buffer);
        }
        const worksheet = workbook.getWorksheet(1);
        const headers = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) headers[cell.value.toString().trim().toLowerCase()] = colNumber;
        });

        const previewRows = [];
        const summary = { total: 0, valid: 0, warnings: 0, errors: 0 };

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            if (!row.hasValues) continue;
            summary.total++;
            const rowData = {
                asset_type: getCellValue(row, headers, 'Asset Type') || 'Camera',
                location: getCellValue(row, headers, 'Location')?.toString().trim(),
                ip_address: getCellValue(row, headers, 'IP Address')?.toString().trim(),
                serial_number: getCellValue(row, headers, 'Serial Number')?.toString().trim(),
                nvr_connection: getCellValue(row, headers, 'NVR Connection')?.toString().trim(),
                linked_nvr_id: getCellValue(row, headers, 'Linked NVR ID')?.toString().trim(),
                username: getCellValue(row, headers, 'Username')?.toString().trim(),
                password: getCellValue(row, headers, 'Password')?.toString().trim(),
                status: getCellValue(row, headers, 'Status')?.toString().trim() || 'Active',
                notes: getCellValue(row, headers, 'Notes')?.toString().trim(),
            };

            const rowErrors = [];
            const rowWarnings = [];
            if (!rowData.location) rowErrors.push('Missing Location');

            const duplicateMode = req.headers['x-duplicate-mode'] || 'skip';
            const isSkipOrUpdate = ['skip', 'update'].includes(duplicateMode);

            // Duplicate Check in Preview — only IP and Serial Number
            if (rowData.ip_address) {
                const existing = await SurveillanceAsset.findOne({ ip_address: rowData.ip_address });
                if (existing) {
                    const msg = `IP ${rowData.ip_address} already exists (${existing.location}).`;
                    if (isSkipOrUpdate) rowWarnings.push(msg); else rowErrors.push(msg);
                }
            }
            if (rowData.serial_number) {
                const existingSn = await SurveillanceAsset.findOne({ serial_number: rowData.serial_number });
                if (existingSn) {
                    const msg = `Serial ${rowData.serial_number} already exists.`;
                    if (isSkipOrUpdate) rowWarnings.push(msg); else rowErrors.push(msg);
                }
            }

            const rowFinalStatus = rowErrors.length > 0 ? 'error' : (rowWarnings.length > 0 ? 'warning' : 'valid');
            if (rowFinalStatus === 'error') summary.errors++;
            else if (rowFinalStatus === 'warning') summary.warnings++;
            else summary.valid++;

            previewRows.push({ rowNumber: i, data: rowData, status: rowFinalStatus, errors: rowErrors, warnings: rowWarnings });
        }
        res.json({ success: true, data: { rows: previewRows, summary } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// CONFIRM SURVEILLANCE
exports.confirmSurveillanceImport = async (req, res) => {
    const { rows, duplicateMode } = req.body;
    const { SurveillanceAsset, ImportBatch, Asset, AssetType } = req.models;
    const branchCode = req.branchCode || 'CHN';
    const branchName = req.branchName || 'Chennai';

    const batchId = `IMP-SURV-${Date.now()}`;
    const batch = new ImportBatch({
        batch_id: batchId,
        module: 'Surveillance',
        file_name: req.body.fileName || 'unknown',
        imported_by: req.user.name || 'System',
        branch: branchName,
        duplicate_mode: duplicateMode || 'skip'
    });

    let success = 0; let failed = 0; let skipped = 0; let updated = 0;
    for (const row of rows) {
        if (row.status === 'error') { failed++; continue; }
        try {
            const assetData = { ...row.data, branch: branchName };

            // Duplicate Check — only IP and Serial Number
            const dupConditions = [];
            if (assetData.ip_address) dupConditions.push({ ip_address: assetData.ip_address });
            if (assetData.serial_number) dupConditions.push({ serial_number: assetData.serial_number });

            let existing = null;
            if (dupConditions.length > 0) {
                existing = await SurveillanceAsset.findOne({ $or: dupConditions });
            }

            if (existing) {
                if (duplicateMode === 'stop') {
                    failed++;
                    batch.errors.push({
                        row: row.rowNumber,
                        error_type: 'Duplicate',
                        message: `Import stopped: duplicate found at "${existing.location}" (IP: ${existing.ip_address || 'N/A'})`,
                        raw_data: row.data
                    });
                    break; // Stop the entire import
                }
                if (duplicateMode === 'skip') {
                    skipped++;
                    continue;
                }
                if (duplicateMode === 'update') {
                    // Update the Surveillance Asset with all new data
                    await SurveillanceAsset.findByIdAndUpdate(existing._id, {
                        $set: {
                            location: assetData.location,
                            ip_address: assetData.ip_address,
                            serial_number: assetData.serial_number,
                            nvr_connection: assetData.nvr_connection,
                            linked_nvr_id: assetData.linked_nvr_id,
                            username: assetData.username,
                            password: assetData.password,
                            status: assetData.status,
                            notes: assetData.notes,
                        }
                    });
                    // Also update linked IT Asset with all fields
                    if (existing.asset_id) {
                        await Asset.findOneAndUpdate(
                            { asset_id: existing.asset_id },
                            {
                                $set: {
                                    location: assetData.location,
                                    ip_address: assetData.ip_address,
                                    status: assetData.status,
                                    'specs.serial_number': assetData.serial_number,
                                    'credentials.username': assetData.username,
                                    'credentials.password': assetData.password,
                                    notes: assetData.notes
                                }
                            }
                        );
                    }
                    updated++;
                    continue;
                }
            }

            // Generate sequential ID and create corresponding IT Asset
            const generatedAssetId = await generateNextAssetId(Asset, AssetType, branchCode, assetData.asset_type || 'Camera', '');

            const newItAssetData = {
                asset_id: generatedAssetId,
                asset_type: assetData.asset_type || 'Camera',
                department: 'Surveillance',
                location: assetData.location,
                status: assetData.status || 'Active',
                ip_address: assetData.ip_address,
                mac_address: '',
                branch: branchName,
                specs: {
                    serial_number: assetData.serial_number,
                    model: `Surveillance ${assetData.asset_type || 'Camera'}`
                },
                credentials: {
                    username: assetData.username,
                    password: assetData.password
                },
                notes: assetData.notes || 'Automatically created from Surveillance Import',
                movement_history: [{
                    moved_by: req.user.name || req.user.username || 'System',
                    moved_date: new Date(),
                    action_type: 'Deploy',
                    notes: `Imported and deployed to ${assetData.location}`
                }]
            };

            await Asset.create(newItAssetData);

            // Link Surveillance Asset to generated IT Asset ID
            assetData.asset_id = generatedAssetId;
            await SurveillanceAsset.create(assetData);

            success++;
        } catch (err) {
            console.error('Import Error Row:', row.rowNumber, err);
            batch.errors.push({
                row: row.rowNumber,
                error_type: err.message.includes('duplicate') ? 'Duplicate' : 'System',
                message: err.message,
                raw_data: row.data
            });
            failed++;
        }
    }
    batch.total_records = rows.length;
    batch.success_count = success;
    batch.failed_count = failed;
    batch.skipped_count = skipped;
    batch.status = failed === 0 ? 'completed' : (success + updated > 0 ? 'partial' : 'failed');
    await batch.save();
    res.json({ success: true, data: { batchId, success, updated, failed, skipped, total: rows.length } });
};

exports.downloadSurveillanceTemplate = async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Surveillance');
    sheet.columns = [
        { header: 'Asset Type', key: 'asset_type', width: 20 },
        { header: 'Location', key: 'location', width: 30 },
        { header: 'IP Address', key: 'ip_address', width: 20 },
        { header: 'Serial Number', key: 'serial_number', width: 25 },
        { header: 'NVR Connection', key: 'nvr_connection', width: 25 },
        { header: 'Linked NVR ID', key: 'linked_nvr_id', width: 20 },
        { header: 'Username', key: 'username', width: 15 },
        { header: 'Password', key: 'password', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Notes', key: 'notes', width: 30 }
    ];
    sheet.addRow({ asset_type: 'Camera', location: 'Main Gate', status: 'Active' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Surveillance_Template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
};
// --- SOFTWARE LICENSES ---
exports.previewLicenses = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    const { SoftwareLicense } = req.models;
    try {
        const workbook = new ExcelJS.Workbook();
        if (req.file.originalname.endsWith('.csv')) await workbook.csv.load(req.file.buffer);
        else await workbook.xlsx.load(req.file.buffer);

        const worksheet = workbook.getWorksheet(1);
        const headers = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) headers[cell.value.toString().trim().toLowerCase()] = colNumber;
        });

        const previewRows = [];
        const summary = { total: 0, valid: 0, warnings: 0, errors: 0 };

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            if (!row.hasValues) continue;
            summary.total++;

            const rowData = {
                software_name: getCellValue(row, headers, 'Software Name')?.toString().trim(),
                vendor: getCellValue(row, headers, 'Vendor')?.toString().trim(),
                license_key: getCellValue(row, headers, 'License Key')?.toString().trim(),
                license_type: getCellValue(row, headers, 'License Type')?.toString().trim() || 'Perpetual',
                seats_purchased: parseInt(getCellValue(row, headers, 'Seats Purchased')) || 1,
                expiry_date: getCellValue(row, headers, 'Expiry Date'),
                department: getCellValue(row, headers, 'Department')?.toString().trim(),
                cost: parseFloat(getCellValue(row, headers, 'Cost')) || 0,
                notes: getCellValue(row, headers, 'Notes')?.toString().trim(),
                status: normalizeStatus(getCellValue(row, headers, 'Status'), 'Active'),
            };

            const rowErrors = [];
            const rowWarnings = [];

            if (!rowData.software_name) rowErrors.push('Missing Software Name');

            const duplicateMode = req.headers['x-duplicate-mode'] || 'skip';
            const isSkipOrUpdate = ['skip', 'update'].includes(duplicateMode);

            // Duplicate Check (Name + Type)
            const existing = await SoftwareLicense.findOne({
                software_name: new RegExp(`^${rowData.software_name}$`, 'i'),
                license_type: rowData.license_type
            });
            if (existing) {
                const msg = `Duplicate: ${rowData.software_name} (${rowData.license_type}) already exists.`;
                if (isSkipOrUpdate) rowWarnings.push(msg); else rowErrors.push(msg);
            }

            const rowFinalStatus = rowErrors.length > 0 ? 'error' : (rowWarnings.length > 0 ? 'warning' : 'valid');
            if (rowFinalStatus === 'error') summary.errors++;
            else if (rowFinalStatus === 'warning') summary.warnings++;
            else summary.valid++;

            previewRows.push({ rowNumber: i, data: rowData, status: rowFinalStatus, errors: rowErrors, warnings: rowWarnings });
        }
        res.json({ success: true, data: { rows: previewRows, summary } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.confirmLicenseImport = async (req, res) => {
    const { rows, duplicateMode, fileName } = req.body;
    const { SoftwareLicense, ImportBatch } = req.models;
    const branchName = req.branchName || 'Chennai';

    const batchId = `IMP-LIC-${Date.now()}`;
    const batch = new ImportBatch({
        batch_id: batchId,
        module: 'Licenses',
        file_name: fileName || 'unknown',
        imported_by: req.user.name || 'System',
        branch: branchName,
        duplicate_mode: duplicateMode || 'skip'
    });

    let success = 0; let failed = 0; let skipped = 0; let updated = 0;
    for (const row of rows) {
        if (row.status === 'error') { failed++; continue; }
        try {
            const licenseData = { ...row.data, branch: branchName };
            const existing = await SoftwareLicense.findOne({
                software_name: new RegExp(`^${licenseData.software_name}$`, 'i'),
                license_type: licenseData.license_type
            });

            if (existing) {
                if (duplicateMode === 'stop') {
                    batch.errors.push({ row: row.rowNumber, error_type: 'Duplicate', message: 'Import stopped due to duplicate', raw_data: row.data });
                    break;
                }
                if (duplicateMode === 'skip') { skipped++; continue; }
                if (duplicateMode === 'update') {
                    await SoftwareLicense.findByIdAndUpdate(existing._id, licenseData);
                    updated++; continue;
                }
            }
            await SoftwareLicense.create(licenseData);
            success++;
        } catch (err) {
            batch.errors.push({ row: row.rowNumber, error_type: 'System', message: err.message, raw_data: row.data });
            failed++;
        }
    }
    batch.total_records = rows.length; batch.success_count = success; batch.failed_count = failed; batch.skipped_count = skipped;
    batch.status = failed === 0 ? 'completed' : (success + updated > 0 ? 'partial' : 'failed');
    await batch.save();
    res.json({ success: true, data: { batchId, success, updated, failed, skipped, total: rows.length } });
};

exports.downloadLicenseTemplate = async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Software Licenses');
    sheet.columns = [
        { header: 'Software Name', key: 'software_name', width: 30 },
        { header: 'Vendor', key: 'vendor', width: 20 },
        { header: 'License Key', key: 'license_key', width: 25 },
        { header: 'License Type', key: 'license_type', width: 15 },
        { header: 'Seats Purchased', key: 'seats_purchased', width: 15 },
        { header: 'Expiry Date', key: 'expiry_date', width: 15 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Cost', key: 'cost', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Notes', key: 'notes', width: 30 }
    ];
    sheet.addRow({
        software_name: 'Microsoft Office 2021',
        vendor: 'Microsoft',
        license_key: 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
        license_type: 'Perpetual',
        seats_purchased: 10,
        expiry_date: '2026-12-31',
        department: 'Administration',
        cost: 45000,
        status: 'Active',
        notes: 'Sample software license'
    });
    sheet.addRow({
        software_name: 'Adobe Creative Cloud',
        vendor: 'Adobe',
        license_type: 'Subscription',
        seats_purchased: 5,
        expiry_date: '2025-06-15',
        department: 'Marketing',
        status: 'Active'
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Software_License_Template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
};

// --- COMMUNICATIONS ---
exports.previewCommunications = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    const { CommunicationAsset } = req.models;
    const assetType = req.headers['x-default-status'] || 'CUG'; // Reusing header for type

    try {
        const workbook = new ExcelJS.Workbook();
        if (req.file.originalname.endsWith('.csv')) await workbook.csv.load(req.file.buffer);
        else await workbook.xlsx.load(req.file.buffer);

        const worksheet = workbook.getWorksheet(1);
        const headers = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) headers[cell.value.toString().trim().toLowerCase()] = colNumber;
        });

        const previewRows = [];
        const summary = { total: 0, valid: 0, warnings: 0, errors: 0 };
        const duplicateMode = req.headers['x-duplicate-mode'] || 'skip';
        const isSkipOrUpdate = ['skip', 'update'].includes(duplicateMode);


        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            if (!row.hasValues) continue;
            summary.total++;

            const rowData = {
                asset_type: assetType,
                department: getCellValue(row, headers, 'Department')?.toString().trim(),
                assigned_user: getCellValue(row, headers, 'Assigned User')?.toString().trim(),
                status: normalizeStatus(getCellValue(row, headers, 'Status'), 'Active'),
                notes: getCellValue(row, headers, 'Notes')?.toString().trim(),
                // CUG
                mobile_number: getCellValue(row, headers, 'Mobile Number')?.toString().trim(),
                sim_number: getCellValue(row, headers, 'SIM Number')?.toString().trim(),
                provider: getCellValue(row, headers, 'Provider')?.toString().trim(),
                plan_name: getCellValue(row, headers, 'Plan Name')?.toString().trim(),
                monthly_cost: parseFloat(getCellValue(row, headers, 'Monthly Cost')) || 0,
                starnumber: getCellValue(row, headers, 'Star Number')?.toString().trim(),
                linked_asset_id: getCellValue(row, headers, 'Linked Asset ID')?.toString().trim(),
                landline_number: getCellValue(row, headers, 'Number')?.toString().trim(),
                // Mail
                email_id: getCellValue(row, headers, 'Email ID')?.toString().trim()?.toLowerCase(),
                account_type: getCellValue(row, headers, 'Account Type')?.toString().trim() || 'Individual',
                platform: getCellValue(row, headers, 'Platform')?.toString().trim() || 'Outlook/O365',
                password: getCellValue(row, headers, 'Password')?.toString().trim(),
            };

            const rowErrors = [];
            const rowWarnings = [];

            if (assetType === 'CUG') {
                if (!rowData.mobile_number) rowErrors.push('Missing Mobile Number');
                else {
                    const existing = await CommunicationAsset.findOne({ mobile_number: rowData.mobile_number, asset_type: 'CUG' });
                    if (existing) {
                        const msg = `Mobile ${rowData.mobile_number} already exists.`;
                        if (isSkipOrUpdate) rowWarnings.push(msg); else rowErrors.push(msg);
                    }
                }
            } else if (assetType === 'Mail') {
                if (!rowData.email_id) rowErrors.push('Missing Email ID');
                else {
                    const existing = await CommunicationAsset.findOne({ email_id: rowData.email_id, asset_type: 'Mail' });
                    if (existing) {
                        const msg = `Email ${rowData.email_id} already exists.`;
                        if (isSkipOrUpdate) rowWarnings.push(msg); else rowErrors.push(msg);
                    }
                }
            } else if (assetType === 'Landline') {
                if (!rowData.starnumber) {
                    rowErrors.push('Missing Star Number');
                } else {
                    // Check duplicate Star Number
                    const existingStar = await CommunicationAsset.findOne({ starnumber: rowData.starnumber, asset_type: 'Landline' });
                    if (existingStar) {
                        const msg = `Star Number ${rowData.starnumber} already exists.`;
                        if (isSkipOrUpdate) rowWarnings.push(msg); else rowErrors.push(msg);
                    }

                    // Check duplicate External Number (landline_number), only if provided
                    if (rowData.landline_number) {
                        const existingNum = await CommunicationAsset.findOne({ landline_number: rowData.landline_number, asset_type: 'Landline' });
                        if (existingNum) rowWarnings.push(`External Number ${rowData.landline_number} already exists.`);
                    }
                }
            }

            const rowFinalStatus = rowErrors.length > 0 ? 'error' : (rowWarnings.length > 0 ? 'warning' : 'valid');
            if (rowFinalStatus === 'error') summary.errors++;
            else if (rowFinalStatus === 'warning') summary.warnings++;
            else summary.valid++;

            previewRows.push({ rowNumber: i, data: rowData, status: rowFinalStatus, errors: rowErrors, warnings: rowWarnings });
        }
        res.json({ success: true, data: { rows: previewRows, summary } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.confirmCommunicationImport = async (req, res) => {
    const { rows, duplicateMode, fileName } = req.body;
    const { CommunicationAsset, ImportBatch } = req.models;
    const branchName = req.branchName || 'Chennai';

    const batchId = `IMP-COMM-${Date.now()}`;
    const batch = new ImportBatch({
        batch_id: batchId,
        module: 'Communications',
        file_name: fileName || 'unknown',
        imported_by: req.user.name || 'System',
        branch: branchName,
        duplicate_mode: duplicateMode || 'skip'
    });

    let success = 0; let failed = 0; let skipped = 0; let updated = 0;
    for (const row of rows) {
        if (row.status === 'error') { failed++; continue; }
        try {
            const commData = { ...row.data, branch: branchName };
            let existing = null;
            if (commData.asset_type === 'CUG') {
                existing = await CommunicationAsset.findOne({ mobile_number: commData.mobile_number, asset_type: 'CUG' });
            } else if (commData.asset_type === 'Mail') {
                existing = await CommunicationAsset.findOne({ email_id: commData.email_id, asset_type: 'Mail' });
            } else if (commData.asset_type === 'Landline') {
                existing = await CommunicationAsset.findOne({ starnumber: commData.starnumber, asset_type: 'Landline' });
            }

            if (existing) {
                if (duplicateMode === 'stop') {
                    batch.errors.push({ row: row.rowNumber, error_type: 'Duplicate', message: 'Import stopped due to duplicate', raw_data: row.data });
                    break;
                }
                if (duplicateMode === 'skip') { skipped++; continue; }
                if (duplicateMode === 'update') {
                    await CommunicationAsset.findByIdAndUpdate(existing._id, commData);
                    updated++; continue;
                }
            }
            await CommunicationAsset.create(commData);
            success++;
        } catch (err) {
            batch.errors.push({ row: row.rowNumber, error_type: 'System', message: err.message, raw_data: row.data });
            failed++;
        }
    }
    batch.total_records = rows.length; batch.success_count = success; batch.failed_count = failed; batch.skipped_count = skipped;
    batch.status = failed === 0 ? 'completed' : (success + updated > 0 ? 'partial' : 'failed');
    await batch.save();
    res.json({ success: true, data: { batchId, success, updated, failed, skipped, total: rows.length } });
};

exports.downloadCommunicationTemplate = async (req, res) => {
    const type = req.query.type || 'CUG';
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(type === 'CUG' ? 'CUG Plans' : type === 'Mail' ? 'Mail Accounts' : 'Landlines');

    if (type === 'CUG') {
        sheet.columns = [
            { header: 'Mobile Number', key: 'mobile_number', width: 20 },
            { header: 'Star Number', key: 'starnumber', width: 15 },
            { header: 'SIM Number', key: 'sim_number', width: 20 },
            { header: 'Provider', key: 'provider', width: 15 },
            { header: 'Plan Name', key: 'plan_name', width: 20 },
            { header: 'Monthly Cost', key: 'monthly_cost', width: 15 },
            { header: 'Assigned User', key: 'assigned_user', width: 20 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Linked Asset ID', key: 'linked_asset_id', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Notes', key: 'notes', width: 30 }
        ];
        sheet.addRow({
            mobile_number: '9876543210',
            starnumber: '*123',
            sim_number: '8991000000000000000',
            provider: 'Airtel',
            plan_name: '199 CUG Plan',
            monthly_cost: 199,
            assigned_user: 'John Doe',
            department: 'IT',
            linked_asset_id: 'MOB-01',
            status: 'Active',
            notes: 'Sample CUG plan'
        });
        sheet.addRow({
            mobile_number: '9123456789',
            provider: 'Jio',
            plan_name: 'Unlimited 299',
            monthly_cost: 299,
            status: 'Active'
        });
    } else if (type === 'Mail') {
        sheet.columns = [
            { header: 'Email ID', key: 'email_id', width: 30 },
            { header: 'Assigned User', key: 'assigned_user', width: 20 },
            { header: 'Platform', key: 'platform', width: 20 },
            { header: 'Account Type', key: 'account_type', width: 15 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Password', key: 'password', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Notes', key: 'notes', width: 30 }
        ];
        sheet.addRow({
            email_id: 'john.doe@gemhospital.com',
            assigned_user: 'John Doe',
            platform: 'Outlook/O365',
            account_type: 'Individual',
            department: 'IT',
            password: 'SamplePassword123',
            status: 'Active',
            notes: 'Sample mail account'
        });
        sheet.addRow({
            email_id: 'it.support@gemhospital.com',
            platform: 'Gmail',
            account_type: 'Shared',
            department: 'IT',
            status: 'Active'
        });
    } else if (type === 'Landline') {
        sheet.columns = [
            { header: 'Star Number', key: 'starnumber', width: 20 },
            { header: 'Number', key: 'landline_number', width: 25 },
            { header: 'Assigned User', key: 'assigned_user', width: 25 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Notes', key: 'notes', width: 30 }
        ];
        sheet.addRow({
            starnumber: '*101',
            landline_number: '044-24320000',
            assigned_user: 'Reception',
            department: 'Help Desk',
            status: 'Active',
            notes: 'Primary reception line'
        });
        sheet.addRow({
            starnumber: '*205',
            landline_number: '044-24320001',
            assigned_user: 'IT Office',
            department: 'IT',
            status: 'Active'
        });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_Template.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
};
