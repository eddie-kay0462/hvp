import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { verifyAdminToken } from '../middleware/auth.js';
import { responseHandler } from '../middleware/responseHandler.js';

const router = express.Router();

// All admin routes require a valid token AND admin role
router.use(verifyAdminToken);

router.get('/services/pending', responseHandler(adminController.getPendingServices));
router.get('/services', responseHandler(adminController.getAllServices));
router.post('/services/:serviceId/approve', responseHandler(adminController.approveService));
router.post('/services/:serviceId/reject', responseHandler(adminController.rejectService));
router.get('/services/stats', responseHandler(adminController.getServiceStats));

export default router;

