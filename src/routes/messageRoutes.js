import express from 'express';
import messageController from '../controllers/messageController.js';

const router = express.Router();

/**
 * @route   POST /api/messages/notify
 * @desc    Supabase Database Webhook — fires on messages INSERT, sends email to recipient
 * @access  Secured by WEBHOOK_SECRET env var (Authorization: Bearer <secret>)
 */
router.post('/notify', messageController.notify);

export default router;
