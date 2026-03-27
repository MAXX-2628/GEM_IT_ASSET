const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// ─── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', stockController.getDashboard);

// ─── Items ─────────────────────────────────────────────────────────────────────
router.get('/items', stockController.getItems);
router.get('/items/export', stockController.exportItems);
router.get('/items/:id', stockController.getItemById);
router.post('/items', stockController.createItem);
router.put('/items/:id', stockController.updateItem);
router.delete('/items/:id', stockController.deleteItem);

// ─── Transactions ──────────────────────────────────────────────────────────────
router.get('/transactions', stockController.getTransactions);
router.get('/transactions/export', stockController.exportTransactions);
router.post('/transactions/inward', stockController.inward);
router.post('/transactions/outward', stockController.outward);

module.exports = router;
