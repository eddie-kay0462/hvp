/**
 * Payment Service - Stubs for future payment integration
 * 
 * TODO: Implement actual payment gateway integration when API is ready
 * This service provides the structure for payment operations
 */

import { supabase, supabaseAdmin } from '../config/supabase.js';
import { initializeTransaction, verifyTransaction } from '../config/paystack.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
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

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  // Get latest invoice for the current year to increment
  const db = supabaseAdmin || supabase;
  const { data: invoices, error } = await db
    .from('invoices')
    .select('invoice_number, created_at')
    .ilike('invoice_number', `HV-${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest invoice number:', error);
  }

  let nextSeq = 1;
  if (invoices && invoices.length > 0) {
    const last = invoices[0].invoice_number;
    const parts = last.split('-');
    const seqStr = parts[2] || '0000';
    const seq = parseInt(seqStr, 10);
    if (!isNaN(seq)) {
      nextSeq = seq + 1;
    }
  }
  const padded = String(nextSeq).padStart(4, '0');
  return `HV-${year}-${padded}`;
}

export const initiatePaymentForBooking = async (userId, bookingId) => {
  try {
    if (!userId || !bookingId) {
      return { status: 400, msg: 'User ID and booking ID are required', data: null };
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

export const verifyPaymentReference = async (reference) => {
  try {
    if (!reference) {
      return { status: 400, msg: 'Reference is required', data: null };
    }

    const db = supabaseAdmin || supabase;
    const verifyRes = await verifyTransaction(reference);
    if (!verifyRes?.status || !verifyRes?.data) {
      return { status: 502, msg: 'Failed to verify transaction with Paystack', data: null };
    }

    const v = verifyRes.data;
    if (v.status !== 'success') {
      return { status: 400, msg: 'Payment not successful', data: { paystack_status: v.status } };
    }

    // Find booking by reference or metadata
    let bookingId = null;
    if (v?.metadata?.booking_id) {
      bookingId = v.metadata.booking_id;
    } else {
      const { data: bookingByRef } = await db
        .from('bookings')
        .select('id')
        .eq('payment_transaction_id', reference)
        .single();
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
        paystack_reference: reference
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Failed to create invoice:', invoiceError);
      // Still return success for payment, but note invoice creation failure
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
  try {
    if (!bookingId || !amount) {
      return { status: 400, msg: "Booking ID and amount are required", data: null };
    }

    // TODO: Implement actual payment capture when payment API is ready
    // Example structure for future implementation:
    /*
    const paymentGateway = require('../config/paymentGateway');
    
    const paymentResult = await paymentGateway.charge({
      amount: amount * 100, // Convert to cents
      currency: currency,
      booking_id: bookingId,
      description: `Booking payment for ${bookingId}`
    });
    
    return {
      status: 200,
      msg: "Payment captured successfully",
      data: {
        transaction_id: paymentResult.id,
        status: 'captured',
        captured_at: new Date().toISOString(),
        amount: amount,
        currency: currency
      }
    };
    */

    // STUB: For now, return success without actual payment processing
    return {
      status: 200,
      msg: "Payment captured (stub - not actually charged)",
      data: {
        transaction_id: `stub_${Date.now()}_${bookingId}`,
        status: 'captured',
        captured_at: new Date().toISOString(),
        amount: amount,
        currency: currency
      }
    };
  } catch (e) {
    console.error("capturePayment error:", e);
    return { status: 500, msg: "Failed to capture payment", data: null };
  }
};

/**
 * Release payment from escrow to seller
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Release result
 */
export const releasePayment = async (bookingId) => {
  try {
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    // TODO: Implement actual payment release when payment API is ready
    // Example structure:
    /*
    const paymentGateway = require('../config/paymentGateway');
    const { data: booking } = await supabase
      .from('bookings')
      .select('payment_transaction_id, payment_amount')
      .eq('id', bookingId)
      .single();
    
    const releaseResult = await paymentGateway.release({
      transaction_id: booking.payment_transaction_id,
      amount: booking.payment_amount
    });
    
    return {
      status: 200,
      msg: "Payment released successfully",
      data: {
        released_at: new Date().toISOString(),
        transaction_id: releaseResult.id
      }
    };
    */

    // STUB: For now, return success without actual payment processing
    return {
      status: 200,
      msg: "Payment released (stub - not actually released)",
      data: {
        released_at: new Date().toISOString(),
        transaction_id: `release_${Date.now()}_${bookingId}`
      }
    };
  } catch (e) {
    console.error("releasePayment error:", e);
    return { status: 500, msg: "Failed to release payment", data: null };
  }
};

/**
 * Refund payment to buyer
 * @param {string} bookingId - Booking ID
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Refund result
 */
export const refundPayment = async (bookingId, reason = 'Cancelled by user') => {
  try {
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    // TODO: Implement actual payment refund when payment API is ready
    // Example structure:
    /*
    const paymentGateway = require('../config/paymentGateway');
    const { data: booking } = await supabase
      .from('bookings')
      .select('payment_transaction_id, payment_amount')
      .eq('id', bookingId)
      .single();
    
    const refundResult = await paymentGateway.refund({
      transaction_id: booking.payment_transaction_id,
      amount: booking.payment_amount,
      reason: reason
    });
    
    return {
      status: 200,
      msg: "Payment refunded successfully",
      data: {
        refunded_at: new Date().toISOString(),
        transaction_id: refundResult.id,
        reason: reason
      }
    };
    */

    // STUB: For now, return success without actual payment processing
    return {
      status: 200,
      msg: "Payment refunded (stub - not actually refunded)",
      data: {
        refunded_at: new Date().toISOString(),
        transaction_id: `refund_${Date.now()}_${bookingId}`,
        reason: reason
      }
    };
  } catch (e) {
    console.error("refundPayment error:", e);
    return { status: 500, msg: "Failed to refund payment", data: null };
  }
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

