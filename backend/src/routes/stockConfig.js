const express = require('express');
const router = express.Router();
const stockConfigController = require('../controllers/stockConfigController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', stockConfigController.getConfigs);
router.post('/', stockConfigController.createConfig);
router.put('/:id', stockConfigController.updateConfig);
router.delete('/:id', stockConfigController.deleteConfig);

module.exports = router;
