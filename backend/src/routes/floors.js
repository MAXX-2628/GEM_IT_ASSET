const express = require('express');
const router = express.Router();
const floorController = require('../controllers/floorController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', floorController.getFloors);
router.post('/', floorController.createFloor);
router.put('/:id', floorController.updateFloor);
router.delete('/:id', floorController.deleteFloor);

module.exports = router;
