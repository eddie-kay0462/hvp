import express from 'express';
import reviewController from '../controllers/reviewController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/reviews/booking/:bookingId
 * @desc    Create a review for a completed booking
 * @access  Private (buyer only)
 * @body    { rating: number (1-5), review_text?: string }
 */
router.post('/booking/:bookingId', verifyToken, responseHandler(reviewController.createReview));

/**
 * @route   GET /api/reviews/seller/:sellerId
 * @desc    Get all reviews for a seller
 * @access  Public
 */
router.get('/seller/:sellerId', responseHandler(reviewController.getSellerReviews));

/**
 * @route   GET /api/reviews/booking/:bookingId/check
 * @desc    Check if user has already reviewed a booking
 * @access  Private
 */
router.get('/booking/:bookingId/check', verifyToken, responseHandler(reviewController.checkExistingReview));

export default router;

