const express = require('express');
const router = express.Router();
const pmController = require('../controllers/pmController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.use(verifyToken);

// Templates
router.get('/templates', pmController.getTemplates);
router.post('/templates', pmController.createTemplate);
router.put('/templates/:id', pmController.updateTemplate);
router.delete('/templates/:id', pmController.deleteTemplate);

// Schedules
router.get('/schedules', pmController.getSchedules);
router.post('/schedules', pmController.createSchedule);
router.put('/schedules/:id', pmController.updateSchedule);
router.delete('/schedules/:id', pmController.deleteSchedule);

// Records & Completion
router.post('/complete', upload.array('attachments', 10), pmController.completePM);
router.get('/history', pmController.getGlobalHistory);
router.get('/history/:assetId', pmController.getAssetHistory);

module.exports = router;
