const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Authenticated routes
router.use(verifyToken);

// Self-update routes (All roles)
router.put('/push-token', userController.updatePushToken);

// Role-protected routes (Super Admin only)
router.use(requireRole('super_admin'));
router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/:id/reset-password', userController.resetPassword);

module.exports = router;
