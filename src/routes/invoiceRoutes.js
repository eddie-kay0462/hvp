import express from 'express';
import invoiceController from '../controllers/invoiceController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id', verifyToken, responseHandler(invoiceController.getById));

export default router;


