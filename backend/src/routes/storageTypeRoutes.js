const express = require('express');
const router = express.Router();
const storageTypeController = require('../controllers/storageTypeController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', storageTypeController.getStorageTypes);
router.post('/', storageTypeController.createStorageType);
router.put('/:id', storageTypeController.updateStorageType);
router.delete('/:id', storageTypeController.deleteStorageType);

module.exports = router;
