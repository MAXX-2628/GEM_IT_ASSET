const express = require('express');
const router = express.Router();
const typeController = require('../controllers/typeController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', typeController.getTypes);
router.post('/', typeController.createType);
router.put('/:id', typeController.updateType);
router.delete('/:id', typeController.deleteType);

module.exports = router;
