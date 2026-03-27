const express = require('express');
const router = express.Router();
const communicationController = require('../controllers/communicationController');
const importController = require('../controllers/importController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(verifyToken);

router.get('/', communicationController.getCommunications);
router.post('/', communicationController.createCommunication);

// Import routes
router.get('/import/template', importController.downloadCommunicationTemplate);
router.post('/import/preview', uploadMemory.single('file'), importController.previewCommunications);
router.post('/import/confirm', importController.confirmCommunicationImport);
router.put('/:id', communicationController.updateCommunication);
router.delete('/:id', communicationController.deleteCommunication);

module.exports = router;
