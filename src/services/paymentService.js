/**
 * Payment Service - Stubs for future payment integration
 * 
 * TODO: Implement actual payment gateway integration when API is ready
 * This service provides the structure for payment operations
 */

import { supabase, supabaseAdmin } from '../config/supabase.js';
import { initializeTransaction, verifyTransaction } from '../config/paystack.js';
import { isMomoManualMode } from '../config/paymentMode.js';
import { initiateMomoManualCheckout } from './momoPaymentService.js';
import { generateInvoiceNumber } from './invoiceNumberUtils.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://hustlevillage.app';
const CURRENCY = process.env.PAYSTACK_CURRENCY || 'GHS';

async function getUserEmailById(userId) {
  try {
    if (!supabaseAdmin) return null;
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) {
      console.error('Error fetching user by id:', error);
      return null;
    }
    return data?.user?.email || null;
  } catch (e) {
    console.error('getUserEmailById exception:', e);
    return null;
  }
}

export const initiatePaymentForBooking = async (userId, bookingId) => {
  try {
    if (!userId || !bookingId) {
      return { status: 400, msg: 'User ID and booking ID are required', data: null };
    }

    if (isMomoManualMode()) {
      return initiateMomoManualCheckout(userId, bookingId);
    }

    // DB client (use admin if available to avoid RLS issues)
    const db = supabaseAdmin || supabase;

    // Fetch booking
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select('id, buyer_id, service_id, payment_status, payment_amount')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: 'Booking not found', data: null };
    }

    // Validate ownership: support projects where buyer_id might be profile.id or auth.users.id
    let ownsBooking = booking.buyer_id === userId;
    if (!ownsBooking) {
      // Try resolve user's profile id and compare
      try {
        const { data: profile } = await db
          .from('profiles')
          .select('id, user_id')
          .or(`id.eq.${userId},user_id.eq.${userId}`)
          .limit(1)
          .single();
        if (profile?.id && booking.buyer_id === profile.id) {
          ownsBooking = true;
        }
      } catch {
        // ignore, fallback to previous
      }
    }
    if (!ownsBooking) {
      return { status: 403, msg: 'You do not have permission to pay for this booking', data: null };
    }

    if (booking.payment_status === 'paid') {
      return { status: 400, msg: 'Booking already paid', data: null };
    }

    // Determine amount
    let amount = booking.payment_amount;
    if (!amount) {
      const { data: service, error: serviceError } = await db
        .from('services')
        .select('default_price')
        .eq('id', booking.service_id)
        .single();
      if (serviceError || !service) {
        return { status: 404, msg: 'Service not found for booking', data: null };
      }
      amount = service.default_price || 0;
      // Persist amount on booking
      await db
        .from('bookings')
        .update({ payment_amount: amount })
        .eq('id', bookingId);
    }

    // Enforce a sane minimum (Paystack may reject too-small amounts)
    const normalizedAmount = Math.max(Number(amount) || 0, 1);
    if (!normalizedAmount || Number.isNaN(normalizedAmount)) {
      return { status: 400, msg: 'Invalid payment amount', data: null };
    }

    // Buyer email
    const email = await getUserEmailById(userId);
    if (!email) {
      return { status: 400, msg: 'Buyer email not found for Paystack initialization', data: null };
    }

    // Initialize Paystack
    const initRes = await initializeTransaction({
      email,
      amount: Math.round(normalizedAmount * 100),
      currency: CURRENCY,
      callback_url: `${FRONTEND_URL.replace(/\/+$/, '')}/payment/callback`,
      metadata: {
        booking_id: booking.id,
        buyer_id: booking.buyer_id,
        service_id: booking.service_id
      }
    });

    if (!initRes?.status || !initRes?.data) {
      return { status: 502, msg: 'Failed to initialize payment with Paystack', data: null };
    }

    const { authorization_url, reference } = initRes.data;

    // Save reference and pending status
    const { error: updateError } = await db
      .from('bookings')
      .update({
        payment_transaction_id: reference,
        payment_status: 'pending'
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Failed to update booking with reference:', updateError);
      // Do not fail the whole process; still return auth URL so user can pay
    }

    return {
      status: 200,
      msg: 'Payment initialized',
      data: { authorization_url, reference }
    };
  } catch (e) {
    console.error('initiatePaymentForBooking error:', e);
    return { status: 500, msg: 'Failed to initiate payment', data: null };
  }
};

export const verifyPaymentReference = async (reference, requestingUserId = null) => {
  try {
    if (!reference) {
      return { status: 400, msg: 'Reference is required', data: null };
    }

    const db = supabaseAdmin || supabase;

    // Idempotency: if this reference was already processed, return the existing invoice
    const { data: existingInvoice } = await db
      .from('invoices')
      .select('id, booking_id')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (existingInvoice) {
      return {
        status: 200,
        msg: 'Payment already verified',
        data: { success: true, booking_id: existingInvoice.booking_id, invoice_id: existingInvoice.id }
      };
    }

    const verifyRes = await verifyTransaction(reference);
    if (!verifyRes?.status || !verifyRes?.data) {
      return { status: 502, msg: 'Failed to verify transaction with Paystack', data: null };
    }

    const v = verifyRes.data;
    if (v.status !== 'success') {
      return { status: 400, msg: 'Payment not successful', data: { paystack_status: v.status } };
    }

    // Find booking by metadata or by stored reference
    let bookingId = v?.metadata?.booking_id || null;
    if (!bookingId) {
      const { data: bookingByRef } = await db
        .from('bookings')
        .select('id')
        .eq('payment_transaction_id', reference)
        .maybeSingle();
      bookingId = bookingByRef?.id || null;
    }

    if (!bookingId) {
      return { status: 404, msg: 'Related booking not found for this payment', data: null };
    }

    // Load booking details
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select('id, buyer_id, service_id, payment_amount')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: 'Booking not found', data: null };
    }

    // Ownership check: the requesting user must be the buyer
    if (requestingUserId && booking.buyer_id !== requestingUserId) {
      return { status: 403, msg: 'You do not have permission to verify this payment', data: null };
    }

    // Update booking as paid
    const paidAt = v.paid_at || new Date().toISOString();
    const { error: updateError } = await db
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_captured_at: paidAt,
        payment_transaction_id: reference
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Failed to update booking payment status:', updateError);
      return { status: 500, msg: 'Payment verified but failed to update booking', data: null };
    }

    // Create invoice
    const invoiceNumber = await generateInvoiceNumber();
    const { data: invoice, error: invoiceError } = await db
      .from('invoices')
      .insert({
        booking_id: booking.id,
        buyer_id: booking.buyer_id,
        service_id: booking.service_id,
        amount: booking.payment_amount,
        currency: CURRENCY,
        invoice_number: invoiceNumber,
        paystack_reference: reference,
        payment_reference: reference,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Failed to create invoice:', invoiceError);
      return {
        status: 200,
        msg: 'Payment verified. Invoice creation failed.',
        data: { success: true, booking_id: booking.id, invoice_id: null }
      };
    }

    return {
      status: 200,
      msg: 'Payment verified successfully',
      data: { success: true, booking_id: booking.id, invoice_id: invoice.id }
    };
  } catch (e) {
    console.error('verifyPaymentReference error:', e);
    return { status: 500, msg: 'Failed to verify payment', data: null };
  }
};

/**
 * Capture payment for a booking
 * @param {string} bookingId - Booking ID
 * @param {number} amount - Payment amount
 * @param {string} currency - Currency code (default: 'GHS')
 * @returns {Promise<Object>} Payment result
 */
export const capturePayment = async (bookingId, amount, currency = 'GHS') => {
  // Payments are captured via Paystack initiate/verify flow, not this function.
  // This stub is kept for API compatibility; remove once callers are updated.
  return { status: 501, msg: "Use /api/payments/initiate to capture payment via Paystack.", data: null };
};

/**
 * Release payment to seller after funds were held securely
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Release result
 */
export const releasePayment = async (bookingId) => {
  if (isMomoManualMode()) {
    // MoMo is manual — funds already received; no transfer needed
    return { status: 200, msg: "Payment released", data: null };
  }
  // TODO: Implement Paystack Transfer API for card payments
  return {
    status: 501,
    msg: "Payment release to seller is not yet implemented. Please contact support to process your payment.",
    data: null
  };
};

/**
 * Refund payment to buyer
 * @param {string} bookingId - Booking ID
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Refund result
 */
export const refundPayment = async (bookingId, reason = 'Cancelled by user') => {
  // TODO: Implement Paystack refund via their Refunds API.
  // Reference: https://paystack.com/docs/payments/refunds
  return { status: 501, msg: "Refunds are not yet automated. Contact support to process a refund.", data: null };
};

/**
 * Check payment status
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Payment status
 */
export const getPaymentStatus = async (bookingId) => {
  try {
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    const { supabase } = await import('../config/supabase.js');
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('payment_status, payment_captured_at, payment_released_at, payment_amount, payment_transaction_id')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { status: 404, msg: "Booking not found", data: null };
    }

    return {
      status: 200,
      msg: "Payment status retrieved",
      data: {
        payment_status: booking.payment_status,
        payment_captured_at: booking.payment_captured_at,
        payment_released_at: booking.payment_released_at,
        payment_amount: booking.payment_amount,
        payment_transaction_id: booking.payment_transaction_id
      }
    };
  } catch (e) {
    console.error("getPaymentStatus error:", e);
    return { status: 500, msg: "Failed to get payment status", data: null };
  }
};

