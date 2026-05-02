import { initiatePaymentForBooking, verifyPaymentReference } from '../services/paymentService.js';
import { submitMomoPaymentProof } from '../services/momoPaymentService.js';

/**
 * POST /api/payments/initiate
 * Body: { bookingId }
 */
const initiate = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: 'Unauthorized', data: null };
    }
    const { bookingId } = req.body || {};
    if (!bookingId) {
      return { status: 400, msg: 'bookingId is required', data: null };
    }
    const result = await initiatePaymentForBooking(userId, bookingId);
    return { status: result.status, msg: result.msg, data: result.data };
  } catch (e) {
    console.error('initiate payment controller error:', e);
    return { status: 500, msg: 'Failed to initiate payment', data: null };
  }
};

/**
 * GET /api/payments/verify?reference=xyz
 */
const verify = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: 'Unauthorized', data: null };
    }
    const { reference } = req.query || {};
    if (!reference) {
      return { status: 400, msg: 'reference is required', data: null };
    }
    const result = await verifyPaymentReference(reference, userId);
    return { status: result.status, msg: result.msg, data: result.data };
  } catch (e) {
    console.error('verify payment controller error:', e);
    return { status: 500, msg: 'Failed to verify payment', data: null };
  }
};

/**
 * POST /api/payments/momo/submit (multipart: proof, fields: bookingId, momoTransactionId)
 */
const submitMomo = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: 'Unauthorized', data: null };
    }
    const bookingId = req.body?.bookingId;
    const momoTransactionId = req.body?.momoTransactionId;
    const file = req.file;
    const result = await submitMomoPaymentProof(userId, bookingId, momoTransactionId, file);
    return { status: result.status, msg: result.msg, data: result.data };
  } catch (e) {
    console.error('submitMomo payment controller error:', e);
    return { status: 500, msg: 'Failed to submit payment proof', data: null };
  }
};

export default {
  initiate,
  verify,
  submitMomo,
};


