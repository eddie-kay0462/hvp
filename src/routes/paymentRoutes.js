import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Initiate payment (authenticated)
router.post('/initiate', verifyToken, responseHandler(paymentController.initiate));

// Verify payment — requires auth so only the booking owner can trigger verification
router.get('/verify', verifyToken, responseHandler(paymentController.verify));

export default router;


