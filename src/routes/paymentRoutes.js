import express from 'express';
import multer from 'multer';
import paymentController from '../controllers/paymentController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const momoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Initiate payment (authenticated)
router.post('/initiate', verifyToken, responseHandler(paymentController.initiate));

// Verify payment — requires auth so only the booking owner can trigger verification
router.get('/verify', verifyToken, responseHandler(paymentController.verify));

// Manual MoMo: receipt screenshot + transaction ID
router.post(
  '/momo/submit',
  verifyToken,
  momoUpload.single('proof'),
  responseHandler(paymentController.submitMomo)
);

export default router;


