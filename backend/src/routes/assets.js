const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const importController = require('../controllers/importController');

const uploadMemory = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(verifyToken);

router.get('/', assetController.getAssets);
router.get('/search', assetController.searchAssets);
router.get('/next-id', assetController.getNextId);
router.get('/import-template', importController.downloadAssetTemplate);
router.post('/import/preview', uploadMemory.single('file'), importController.previewAssets);
router.post('/import/confirm', importController.confirmAssetImport);
router.get('/import/error-report/:batchId', importController.downloadErrorReport);
router.post('/', upload.single('attachment'), assetController.createAsset);
router.get('/:id', assetController.getAsset);
router.put('/:id', upload.single('attachment'), assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);
router.post('/:id/scrap', assetController.scrapAsset);
router.delete('/:id/remove', assetController.removeAsset);
router.post('/:id/transfer', assetController.transferAsset);

module.exports = router;
