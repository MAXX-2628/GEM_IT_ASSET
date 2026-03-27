const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { verifyToken } = require('../middleware/auth');

// @GET /api/branches
router.get('/', branchController.getBranches);

// @POST /api/branches
router.post('/', verifyToken, branchController.createBranch);

// @POST /api/branches/:id/primary
router.post('/:id/primary', verifyToken, branchController.setPrimary);

// @PATCH /api/branches/reorder
router.patch('/reorder', verifyToken, branchController.reorderBranches);

// @DELETE /api/branches/:id
router.delete('/:id', verifyToken, branchController.deleteBranch);

// @POST /api/branches/:id/restore
router.post('/:id/restore', verifyToken, branchController.restoreBranch);

module.exports = router;
