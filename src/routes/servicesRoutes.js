import express from 'express';
import servicesController from '../controllers/servicesController.js';
import { responseHandler } from '../middleware/responseHandler.js';

const router = express.Router();

/**
 * @route   GET /api/services
 * @desc    Get all services (with optional filters)
 * @access  Public
 * @query   category, search, limit, offset, sortBy, order
 */
router.get('/', responseHandler(servicesController.getAllServices));

/**
 * @route   GET /api/services/:id
 * @desc    Get service by ID
 * @access  Public
 */
router.get('/:id', responseHandler(servicesController.getServiceById));

export default router;