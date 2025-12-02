import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { handleResponse } from '../middleware/responseHandler.js';

const router = express.Router();

/**
 * Admin Routes
 * All routes require authentication and admin role
 */

// Get all pending services awaiting approval
router.get('/services/pending', authenticate, async (req, res, next) => {
  const result = await adminController.getPendingServices(req);
  handleResponse(req, res, result);
});

// Get all services with optional filters
router.get('/services', authenticate, async (req, res, next) => {
  const result = await adminController.getAllServices(req);
  handleResponse(req, res, result);
});

// Approve a service
router.post('/services/:serviceId/approve', authenticate, async (req, res, next) => {
  const result = await adminController.approveService(req);
  handleResponse(req, res, result);
});

// Reject a service
router.post('/services/:serviceId/reject', authenticate, async (req, res, next) => {
  const result = await adminController.rejectService(req);
  handleResponse(req, res, result);
});

// Get service statistics
router.get('/services/stats', authenticate, async (req, res, next) => {
  const result = await adminController.getServiceStats(req);
  handleResponse(req, res, result);
});

export default router;

