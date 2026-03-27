const express = require('express');
const router = express.Router();
const handoverController = require('../controllers/handoverController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for photo and signature
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.use(verifyToken);

router.get('/', handoverController.getHandovers);
router.get('/asset/:id', handoverController.getAssetHandover);
router.post('/bulk', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), handoverController.createBulkHandover);

router.post('/', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), handoverController.createHandover);


module.exports = router;
