const ExcelJS = require('exceljs');

// ─── Stock Items ───────────────────────────────────────────────────────────────

exports.getItems = async (req, res) => {
    const { StockItem } = req.models;
    const { search = '', category = '', low_stock, page = 1, limit = 25 } = req.query;

    const query = {};
    if (search) query.$text = { $search: search };
    if (category) query.category = new RegExp(category, 'i');
    if (low_stock === 'true') {
        query.$expr = { $lte: ['$total_quantity', '$min_stock_level'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
        StockItem.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
        StockItem.countDocuments(query),
    ]);

    // Compute summary stats
    const allItems = await StockItem.find({});
    const lowStockItems = allItems.filter(i => i.total_quantity > 0 && i.total_quantity <= i.min_stock_level).length;
    const criticalItems = allItems.filter(i => i.total_quantity === 0).length;
    const categories = [...new Set(allItems.map(i => i.category).filter(Boolean))].sort();

    res.json({
        success: true,
        data,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        stats: {
            total: allItems.length,
            low_stock: lowStockItems,
            critical: criticalItems,
            in_stock: allItems.length - lowStockItems - criticalItems,
        },
        categories,
    });
};

exports.getItemById = async (req, res) => {
    const { StockItem } = req.models;
    const item = await StockItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
};

exports.createItem = async (req, res) => {
    const { StockItem } = req.models;
    const item = await StockItem.create(req.body);
    res.status(201).json({ success: true, data: item, message: 'Stock item created successfully' });
};

exports.updateItem = async (req, res) => {
    const { StockItem } = req.models;
    const item = await StockItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item, message: 'Stock item updated successfully' });
};

exports.deleteItem = async (req, res) => {
    const { StockItem } = req.models;
    const item = await StockItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    
    // Note: We deliberately do NOT delete associated StockTransactions 
    // to preserve the historical ledger/audit trail.
    res.json({ success: true, message: 'Stock item deleted. Transaction history has been preserved.' });
};

// ─── Stock Transactions ────────────────────────────────────────────────────────

exports.getTransactions = async (req, res) => {
    const { StockTransaction } = req.models;
    const { item_id, type, dept, page = 1, limit = 30 } = req.query;

    const query = {};
    if (item_id) query.stock_item = item_id;
    if (type) query.transaction_type = type;
    if (dept) query.issued_to_dept = new RegExp(dept, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
        StockTransaction.find(query)
            .populate('stock_item', 'name category unit')
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        StockTransaction.countDocuments(query),
    ]);

    res.json({ success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

exports.inward = async (req, res) => {
    const { StockItem, StockTransaction } = req.models;
    const { stock_item_id, quantity, vendor, invoice_number, date, notes, performed_by } = req.body;

    if (!stock_item_id || !quantity) {
        return res.status(400).json({ success: false, message: 'stock_item_id and quantity are required' });
    }

    const item = await StockItem.findById(stock_item_id);
    if (!item) return res.status(404).json({ success: false, message: 'Stock item not found' });

    const qty = parseInt(quantity);

    const transaction = await StockTransaction.create({
        stock_item: stock_item_id,
        item_name: item.name,
        transaction_type: 'inward',
        quantity: qty,
        vendor: vendor || item.vendor,
        invoice_number,
        date: date || new Date(),
        notes,
        performed_by,
    });

    item.total_quantity += qty;
    await item.save();

    res.status(201).json({
        success: true,
        data: transaction,
        new_quantity: item.total_quantity,
        message: `Added ${qty} ${item.unit} of "${item.name}". New stock: ${item.total_quantity}`,
    });
};

exports.outward = async (req, res) => {
    const { StockItem, StockTransaction } = req.models;
    const { stock_item_id, quantity, issued_to_dept, purpose, date, notes, performed_by } = req.body;

    if (!stock_item_id || !quantity) {
        return res.status(400).json({ success: false, message: 'stock_item_id and quantity are required' });
    }

    const item = await StockItem.findById(stock_item_id);
    if (!item) return res.status(404).json({ success: false, message: 'Stock item not found' });

    const qty = parseInt(quantity);

    if (item.total_quantity < qty) {
        return res.status(400).json({
            success: false,
            message: `Insufficient stock. Available: ${item.total_quantity} ${item.unit}, Requested: ${qty}`,
        });
    }

    const transaction = await StockTransaction.create({
        stock_item: stock_item_id,
        item_name: item.name,
        transaction_type: 'outward',
        quantity: qty,
        issued_to_dept,
        purpose,
        date: date || new Date(),
        notes,
        performed_by,
    });

    item.total_quantity -= qty;
    await item.save();

    res.status(201).json({
        success: true,
        data: transaction,
        new_quantity: item.total_quantity,
        stock_status: item.stock_status,
        message: `Issued ${qty} ${item.unit} of "${item.name}". Remaining: ${item.total_quantity}`,
    });
};

// ─── Dashboard Summary ─────────────────────────────────────────────────────────

exports.getDashboard = async (req, res) => {
    const { StockItem, StockTransaction } = req.models;

    const allItems = await StockItem.find({});
    const inStockCount = allItems.filter(i => i.total_quantity > i.min_stock_level).length;
    const lowCount = allItems.filter(i => i.total_quantity > 0 && i.total_quantity <= i.min_stock_level).length;
    const criticalCount = allItems.filter(i => i.total_quantity === 0).length;
    const lowItems = allItems.filter(i => i.total_quantity <= i.min_stock_level).sort((a, b) => a.total_quantity - b.total_quantity);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyOutward = await StockTransaction.aggregate([
        { $match: { transaction_type: 'outward', date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const recentTx = await StockTransaction.find().sort({ date: -1 }).limit(10).populate('stock_item', 'name unit');

    res.json({
        success: true,
        stats: {
            total_items: allItems.length,
            in_stock: inStockCount,
            low_stock: lowCount,
            critical: criticalCount,
            monthly_consumption: monthlyOutward[0]?.total || 0,
        },
        low_stock_alerts: lowItems,
        recent_transactions: recentTx,
    });
};

// ─── Export ────────────────────────────────────────────────────────────────────

exports.exportItems = async (req, res) => {
    const { StockItem } = req.models;
    const items = await StockItem.find().sort({ name: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GEM IT Asset System';
    const sheet = workbook.addWorksheet('Stock Inventory');

    sheet.columns = [
        { header: 'Item Name', key: 'name', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Available Qty', key: 'total_quantity', width: 15 },
        { header: 'Min Level', key: 'min_stock_level', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Vendor', key: 'vendor', width: 20 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Notes', key: 'notes', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    items.forEach(item => {
        const row = sheet.addRow({
            name: item.name,
            category: item.category,
            unit: item.unit,
            total_quantity: item.total_quantity,
            min_stock_level: item.min_stock_level,
            status: item.stock_status,
            vendor: item.vendor || '',
            location: item.location || '',
            notes: item.notes || '',
        });

        // Color row by status
        const statusColor = item.stock_status === 'Critical' ? 'FFFFE4E6' :
            item.stock_status === 'Low' ? 'FFFEF9C3' : 'FFF0FDF4';
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=stock_inventory.xlsx');
    await workbook.xlsx.write(res);
    res.end();
};

exports.exportTransactions = async (req, res) => {
    const { StockTransaction } = req.models;
    const { item_id, type } = req.query;
    const query = {};
    if (item_id) query.stock_item = item_id;
    if (type) query.transaction_type = type;

    const txns = await StockTransaction.find(query).populate('stock_item', 'name unit').sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GEM IT Asset System';
    const sheet = workbook.addWorksheet('Stock Ledger');

    sheet.columns = [
        { header: 'Date', key: 'date', width: 16 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Item', key: 'item', width: 28 },
        { header: 'Qty', key: 'qty', width: 8 },
        { header: 'Vendor', key: 'vendor', width: 20 },
        { header: 'Invoice #', key: 'invoice', width: 16 },
        { header: 'Issued To', key: 'dept', width: 20 },
        { header: 'Purpose', key: 'purpose', width: 16 },
        { header: 'Performed By', key: 'by', width: 18 },
        { header: 'Notes', key: 'notes', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    txns.forEach(tx => {
        const row = sheet.addRow({
            date: tx.date ? new Date(tx.date).toLocaleDateString() : '',
            type: tx.transaction_type?.toUpperCase(),
            item: tx.stock_item?.name || tx.item_name || '',
            qty: tx.quantity,
            vendor: tx.vendor || '',
            invoice: tx.invoice_number || '',
            dept: tx.issued_to_dept || '',
            purpose: tx.purpose || '',
            by: tx.performed_by || '',
            notes: tx.notes || '',
        });
        const color = tx.transaction_type === 'inward' ? 'FFD1FAE5' : 'FFFFE4E6';
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=stock_ledger.xlsx');
    await workbook.xlsx.write(res);
    res.end();
};
