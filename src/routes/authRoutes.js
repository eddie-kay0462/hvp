import express from 'express';
import authController from '../controllers/authController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user and send verification email
 * @access  Public
 */
router.post('/signup', responseHandler(authController.signup));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', responseHandler(authController.login));

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', responseHandler(authController.resendVerification));

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.post('/verify-email', responseHandler(authController.verifyEmail));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user session
 * @access  Private
 */
router.get('/me', verifyToken, responseHandler(authController.getMe));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', verifyToken, responseHandler(authController.logout));



export default router;

