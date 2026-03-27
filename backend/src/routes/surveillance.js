const express = require('express');
const router = express.Router();
const surveillanceController = require('../controllers/surveillanceController');
const importController = require('../controllers/importController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');

const uploadMemory = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);

router.get('/', surveillanceController.getSurveillanceAssets);
router.get('/next-id', surveillanceController.getNextId);
router.get('/import-template', importController.downloadSurveillanceTemplate);
router.post('/import/preview', uploadMemory.single('file'), importController.previewSurveillance);
router.post('/import/confirm', importController.confirmSurveillanceImport);
router.get('/import/error-report/:batchId', importController.downloadErrorReport);
router.post('/deploy', surveillanceController.deployToSurveillance);
router.post('/', surveillanceController.createSurveillanceAsset);
router.put('/:id', surveillanceController.updateSurveillanceAsset);
router.delete('/:id', surveillanceController.deleteSurveillanceAsset);

module.exports = router;
