import express from 'express';
import multer from 'multer';
import * as adminController from '../controllers/adminController.js';
import { verifyAdminToken } from '../middleware/auth.js';
import { responseHandler } from '../middleware/responseHandler.js';

const router = express.Router();
const payoutUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All admin routes require a valid token AND admin role
router.use(verifyAdminToken);

router.get('/services/pending', responseHandler(adminController.getPendingServices));
router.get('/services', responseHandler(adminController.getAllServices));
router.post('/services/:serviceId/approve', responseHandler(adminController.approveService));
router.post('/services/:serviceId/reject', responseHandler(adminController.rejectService));
router.get('/services/stats', responseHandler(adminController.getServiceStats));

router.get('/payments/momo/pending', responseHandler(adminController.getPendingMomoPayments));
router.post(
  '/payments/momo/:bookingId/verify',
  responseHandler(adminController.verifyMomoPayment)
);

router.post(
  '/payouts/:bookingId/confirm',
  payoutUpload.single('proof'),
  responseHandler(adminController.confirmPayout)
);

export default router;

