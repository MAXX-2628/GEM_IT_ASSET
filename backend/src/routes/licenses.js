const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');
const importController = require('../controllers/importController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);

router.get('/', licenseController.getLicenses);
router.post('/', licenseController.createLicense);

// Import routes
router.get('/import/template', importController.downloadLicenseTemplate);
router.post('/import/preview', uploadMemory.single('file'), importController.previewLicenses);
router.post('/import/confirm', importController.confirmLicenseImport);

router.get('/:id', licenseController.getLicense);
router.put('/:id', licenseController.updateLicense);
router.delete('/:id', licenseController.deleteLicense);

module.exports = router;
