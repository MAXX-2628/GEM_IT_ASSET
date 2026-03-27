const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const modelInjector = require('../middleware/modelInjector');

const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);
router.use(modelInjector);

router.get('/download', backupController.createBackup);
router.post('/restore', upload.single('file'), backupController.restoreBackup);

module.exports = router;
