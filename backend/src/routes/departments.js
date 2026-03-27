const express = require('express');
const router = express.Router();
const deptController = require('../controllers/departmentController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', deptController.getDepartments);
router.post('/', deptController.createDepartment);
router.put('/:id', deptController.updateDepartment);
router.delete('/:id', deptController.deleteDepartment);

module.exports = router;
