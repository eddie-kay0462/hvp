import express from 'express';
import offerController from '../controllers/offerController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route  POST /api/offers/send
 * @desc   Seller sends a custom price offer inside a conversation
 * @access Private (seller only — enforced in controller)
 * @body   { conversationId, price, note? }
 */
router.post('/send', verifyToken, responseHandler(offerController.sendOffer));

/**
 * @route  POST /api/offers/respond
 * @desc   Buyer accepts or declines an offer; accept creates a booking
 * @access Private (buyer only — enforced in controller)
 * @body   { messageId, accepted: boolean }
 */
router.post('/respond', verifyToken, responseHandler(offerController.respondToOffer));

export default router;
