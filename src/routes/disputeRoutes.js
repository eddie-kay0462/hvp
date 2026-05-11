import express from 'express';
import { verifyToken, verifyAdminToken } from '../middleware/auth.js';
import { responseHandler } from '../middleware/responseHandler.js';
import * as disputeController from '../controllers/disputeController.js';

const router = express.Router();

// Any authenticated user can raise a dispute
router.post('/', verifyToken, responseHandler(disputeController.raiseDispute));

// Admin-only
router.get('/admin', verifyAdminToken, responseHandler(disputeController.getAdminDisputes));
router.patch('/admin/:disputeId/resolve', verifyAdminToken, responseHandler(disputeController.resolveDispute));

export default router;
