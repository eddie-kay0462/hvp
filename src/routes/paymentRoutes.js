import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Initiate payment (authenticated)
router.post('/initiate', verifyToken, responseHandler(paymentController.initiate));

// Verify payment (callback - no auth required)
router.get('/verify', responseHandler(paymentController.verify));

export default router;


