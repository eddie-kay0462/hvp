import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { responseHandler } from '../middleware/responseHandler.js';

const router = express.Router();

/**
 * Admin Routes
 * All routes require authentication and admin role
 */

// Get all pending services awaiting approval
router.get('/services/pending', authenticate, responseHandler(adminController.getPendingServices));

// Get all services with optional filters
router.get('/services', authenticate, responseHandler(adminController.getAllServices));

// Approve a service
router.post('/services/:serviceId/approve', authenticate, responseHandler(adminController.approveService));

// Reject a service
router.post('/services/:serviceId/reject', authenticate, responseHandler(adminController.rejectService));

// Get service statistics
router.get('/services/stats', authenticate, responseHandler(adminController.getServiceStats));

export default router;

