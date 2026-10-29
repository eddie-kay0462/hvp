import express from 'express';
import communityController from '../controllers/communityController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/communities/me
 * @desc    Communities the signed-in user belongs to
 * @access  Private
 */
router.get('/me', verifyToken, responseHandler(communityController.getMyCommunities));

/**
 * @route   GET /api/communities/:slug
 * @desc    Community details and member count
 * @access  Public
 */
router.get('/:slug', responseHandler(communityController.getCommunity));

/**
 * @route   POST /api/communities/:slug/join
 * @desc    Join a community (idempotent). Any email may join.
 * @access  Private
 */
router.post('/:slug/join', verifyToken, responseHandler(communityController.joinCommunity));

export default router;
