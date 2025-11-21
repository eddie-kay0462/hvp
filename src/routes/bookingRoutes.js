import express from 'express';
import bookingController from '../controllers/bookingController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/bookings/book-now
 * @desc    Book a service now
 * @access  Private
 * @body    { serviceId, date, time, status? }
 */
router.post('/book-now', verifyToken, responseHandler(bookingController.bookNow));

/**
 * @route   GET /api/bookings/:bookingId
 * @desc    Get booking by ID
 * @access  Private (buyer or seller of the service)
 */
router.get('/:bookingId', verifyToken, responseHandler(bookingController.getBookingById));

/**
 * @route   GET /api/bookings
 * @desc    Get user's bookings (as buyer or seller)
 * @access  Private
 * @query   role (buyer or seller, defaults to buyer)
 */
router.get('/', verifyToken, responseHandler(bookingController.getUserBookings));
/**
 * @route   PATCH /api/bookings/:bookingId/accept
 * @desc    Accept a booking (seller only)
 * @access  Private (seller)
 */
router.patch('/:bookingId/accept', verifyToken, responseHandler(bookingController.acceptBooking));

/**
 * @route   PATCH /api/bookings/:bookingId/status
 * @desc    Update booking status
 * @access  Private (buyer or seller)
 * @body    { status: 'accepted' | 'in_progress' | 'delivered' | 'completed' | 'cancelled' }
 */
router.patch('/:bookingId/status', verifyToken, responseHandler(bookingController.updateBookingStatus));

/**
 * @route   PATCH /api/bookings/:bookingId/confirm
 * @desc    Confirm booking completion (buyer only)
 * @desc    Moves booking from 'delivered' to 'completed' and releases payment
 * @access  Private (buyer only)
 */
router.patch('/:bookingId/confirm', verifyToken, responseHandler(bookingController.confirmBookingCompletion));

/**
 * @route   PATCH /api/bookings/:bookingId/cancel
 * @desc    Cancel a booking (buyer or seller)
 * @access  Private (buyer or seller)
 */
router.patch('/:bookingId/cancel', verifyToken, responseHandler(bookingController.cancelBooking));

export default router;

