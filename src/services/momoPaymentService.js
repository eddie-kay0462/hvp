/**
 * Manual Mobile Money checkout: instructions + proof submission + admin verification.
 * Paystack remains in paymentService.js when PAYMENT_PROVIDER=paystack.
 */

import { randomBytes } from 'crypto';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { generateInvoiceNumber } from './invoiceNumberUtils.js';

const CURRENCY = process.env.PAYSTACK_CURRENCY || 'GHS';

async function getUserEmailById(userId) {
  try {
    if (!supabaseAdmin) return null;
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) return null;
    return data?.user?.email || null;
  } catch {
    return null;
  }
}

async function resolveBuyerOwnsBooking(db, userId, booking) {
  let ownsBooking = booking.buyer_id === userId;
  if (!ownsBooking) {
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
      /* ignore */
    }
  }
  return ownsBooking;
}

function narrationForBooking(bookingId) {
  const compact = bookingId.replace(/-/g, '').slice(0, 12).toUpperCase();
  return `HV-${compact}`;
}

export async function initiateMomoManualCheckout(userId, bookingId) {
  try {
    if (!userId || !bookingId) {
      return { status: 400, msg: 'User ID and booking ID are required', data: null };
    }

    const momoNumber = process.env.MOMO_DISPLAY_NUMBER?.trim();
    if (!momoNumber) {
      return {
        status: 503,
        msg: 'Mobile Money checkout is not configured. Set MOMO_DISPLAY_NUMBER on the server.',
        data: null,
      };
    }

    const db = supabaseAdmin || supabase;

    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select(
        'id, buyer_id, service_id, payment_status, payment_amount, payment_method, momo_transaction_id'
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: 'Booking not found', data: null };
    }

    const ownsBooking = await resolveBuyerOwnsBooking(db, userId, booking);
    if (!ownsBooking) {
      return { status: 403, msg: 'You do not have permission to pay for this booking', data: null };
    }

    if (booking.payment_status === 'paid' || booking.payment_status === 'released') {
      return { status: 400, msg: 'Booking already paid', data: null };
    }

    if (booking.payment_status === 'pending_review') {
      return {
        status: 400,
        msg: 'Your payment proof is already awaiting verification. We will notify you when it is confirmed.',
        data: null,
      };
    }

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
      await db.from('bookings').update({ payment_amount: amount }).eq('id', bookingId);
    }

    const normalizedAmount = Math.max(Number(amount) || 0, 1);
    if (!normalizedAmount || Number.isNaN(normalizedAmount)) {
      return { status: 400, msg: 'Invalid payment amount', data: null };
    }

    const networks = (process.env.MOMO_NETWORKS || 'MTN,Vodafone,AirtelTigo')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const slaHours = Math.min(
      Math.max(parseInt(process.env.MOMO_PAYMENT_SLA_HOURS || '24', 10) || 24, 1),
      168
    );

    return {
      status: 200,
      msg: 'Pay with Mobile Money',
      data: {
        provider: 'momo_manual',
        bookingId,
        amount: normalizedAmount,
        currency: CURRENCY,
        merchantName: process.env.MOMO_MERCHANT_NAME || 'Hustle Village',
        momoNumber,
        narration: narrationForBooking(bookingId),
        networks,
        slaHours,
        instructions: process.env.MOMO_INSTRUCTIONS || '',
      },
    };
  } catch (e) {
    console.error('initiateMomoManualCheckout error:', e);
    return { status: 500, msg: 'Failed to start Mobile Money checkout', data: null };
  }
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

function extFromMime(mime) {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  return '.jpg';
}

export async function submitMomoPaymentProof(userId, bookingId, momoTransactionId, file) {
  try {
    if (!userId || !bookingId) {
      return { status: 400, msg: 'User ID and booking ID are required', data: null };
    }

    const normalizedTxn = (momoTransactionId || '').trim();
    if (!normalizedTxn || normalizedTxn.length < 4) {
      return { status: 400, msg: 'Please enter a valid Mobile Money transaction ID', data: null };
    }

    if (!file?.buffer || !file.mimetype) {
      return { status: 400, msg: 'A receipt screenshot is required', data: null };
    }

    if (!ALLOWED_MIME.has(file.mimetype)) {
      return { status: 400, msg: 'Screenshot must be JPG, PNG, or WebP', data: null };
    }

    if (file.size > MAX_PROOF_BYTES) {
      return { status: 400, msg: 'Screenshot must be 5MB or smaller', data: null };
    }

    if (!supabaseAdmin) {
      return {
        status: 503,
        msg: 'Payment proof upload requires server configuration (SUPABASE_SERVICE_ROLE_KEY).',
        data: null,
      };
    }

    const db = supabaseAdmin;
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select(
        'id, buyer_id, service_id, payment_status, payment_amount, payment_method, momo_transaction_id'
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: 'Booking not found', data: null };
    }

    const ownsBooking = await resolveBuyerOwnsBooking(db, userId, booking);
    if (!ownsBooking) {
      return { status: 403, msg: 'You do not have permission to update this booking', data: null };
    }

    if (booking.payment_status === 'paid' || booking.payment_status === 'released') {
      return { status: 400, msg: 'This booking is already paid', data: null };
    }

    if (booking.payment_status === 'pending_review') {
      return {
        status: 400,
        msg: 'Proof already submitted. Please wait for our team to verify your payment.',
        data: null,
      };
    }

    const { data: dup } = await db
      .from('bookings')
      .select('id')
      .eq('momo_transaction_id', normalizedTxn)
      .neq('id', bookingId)
      .in('payment_status', ['pending_review', 'paid', 'released'])
      .maybeSingle();

    if (dup?.id) {
      return {
        status: 409,
        msg: 'This transaction ID is already linked to another booking. Check your MoMo receipt or contact support.',
        data: null,
      };
    }

    const bucket = process.env.MOMO_PROOF_BUCKET || 'payment-proofs';
    const ext = extFromMime(file.mimetype);
    const objectPath = `${bookingId}/${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (upErr) {
      console.error('Storage upload error:', upErr);
      return {
        status: 502,
        msg: `Could not upload screenshot: ${upErr.message}. Ensure the "${bucket}" bucket exists in Supabase Storage.`,
        data: null,
      };
    }

    // Private bucket — generate a long-lived signed URL (1 year)
    const { data: signedData, error: signErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(objectPath, 60 * 60 * 24 * 365);

    if (signErr || !signedData?.signedUrl) {
      console.error('Signed URL error:', signErr);
      return { status: 502, msg: 'File uploaded but could not generate view URL.', data: null };
    }

    const proofUrl = signedData.signedUrl;

    const { error: updErr } = await db
      .from('bookings')
      .update({
        payment_method: 'momo_manual',
        momo_transaction_id: normalizedTxn,
        payment_proof_url: proofUrl,
        momo_submitted_at: new Date().toISOString(),
        payment_status: 'pending_review',
        payment_review_note: null,
      })
      .eq('id', bookingId);

    if (updErr) {
      console.error('Booking update after proof upload:', updErr);
      return { status: 500, msg: 'Failed to save payment proof', data: null };
    }

    try {
      const { data: svc } = await db
        .from('services')
        .select('title')
        .eq('id', booking.service_id)
        .maybeSingle();
      const { data: bp } = await db
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', booking.buyer_id)
        .maybeSingle();
      const buyerName =
        `${bp?.first_name || ''} ${bp?.last_name || ''}`.trim() || 'Buyer';
      const { sendMomoProofSubmittedToAdmin } = await import('./emailService.js');
      await sendMomoProofSubmittedToAdmin({
        bookingId,
        serviceTitle: svc?.title || 'Service',
        amountGhs: booking.payment_amount,
        momoTransactionId: normalizedTxn,
        buyerName,
      });
    } catch (emailErr) {
      console.error('[momo] Admin notify email failed:', emailErr?.message || emailErr);
    }

    return {
      status: 200,
      msg: 'Payment proof received. We will verify your Mobile Money payment shortly.',
      data: {
        booking_id: bookingId,
        payment_status: 'pending_review',
      },
    };
  } catch (e) {
    console.error('submitMomoPaymentProof error:', e);
    return { status: 500, msg: 'Failed to submit payment proof', data: null };
  }
}

export async function listPendingMomoPaymentsAdmin() {
  try {
    const db = supabaseAdmin || supabase;
    const { data: rows, error } = await db
      .from('bookings')
      .select(
        `
        id,
        buyer_id,
        service_id,
        payment_amount,
        payment_status,
        payment_method,
        momo_transaction_id,
        payment_proof_url,
        momo_submitted_at,
        payment_review_note,
        created_at,
        service:services ( id, title )
      `
      )
      .eq('payment_status', 'pending_review')
      .order('momo_submitted_at', { ascending: true });

    if (error) {
      console.error('listPendingMomoPaymentsAdmin:', error);
      return { status: 500, msg: 'Failed to load pending payments', data: null };
    }

    const list = rows || [];
    const buyerIds = [...new Set(list.map((r) => r.buyer_id).filter(Boolean))];
    let buyersById = {};
    if (buyerIds.length > 0) {
      const { data: profs } = await db
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', buyerIds);
      buyersById = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    }

    const enriched = list.map((r) => ({
      ...r,
      buyer: buyersById[r.buyer_id] || null,
    }));

    return {
      status: 200,
      msg: 'OK',
      data: enriched,
    };
  } catch (e) {
    console.error('listPendingMomoPaymentsAdmin error:', e);
    return { status: 500, msg: 'Failed to load pending payments', data: null };
  }
}

export async function adminConfirmPayout(bookingId, payoutTransactionId, file) {
  try {
    if (!bookingId) {
      return { status: 400, msg: 'Booking ID is required', data: null };
    }

    const normalizedTxn = (payoutTransactionId || '').trim();
    if (!normalizedTxn || normalizedTxn.length < 4) {
      return { status: 400, msg: 'Please enter a valid payout transaction ID', data: null };
    }

    if (!file?.buffer || !file.mimetype) {
      return { status: 400, msg: 'A payout receipt screenshot is required', data: null };
    }

    if (!ALLOWED_MIME.has(file.mimetype)) {
      return { status: 400, msg: 'Screenshot must be JPG, PNG, or WebP', data: null };
    }

    if (file.size > MAX_PROOF_BYTES) {
      return { status: 400, msg: 'Screenshot must be 5MB or smaller', data: null };
    }

    if (!supabaseAdmin) {
      return { status: 503, msg: 'Payout upload requires server configuration (SUPABASE_SERVICE_ROLE_KEY).', data: null };
    }

    const db = supabaseAdmin;
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select('id, buyer_id, service_id, payment_amount, payment_status, payout_status, service:services(user_id, title)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: 'Booking not found', data: null };
    }

    if (booking.payment_status !== 'released') {
      return { status: 400, msg: 'Payout can only be confirmed for bookings with released payment', data: null };
    }

    if (booking.payout_status === 'sent') {
      return { status: 400, msg: 'Payout has already been confirmed for this booking', data: null };
    }

    const bucket = process.env.MOMO_PROOF_BUCKET || 'payment-proofs';
    const ext = extFromMime(file.mimetype);
    const objectPath = `payouts/${bookingId}/${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (upErr) {
      console.error('Payout proof upload error:', upErr);
      return { status: 502, msg: `Could not upload payout screenshot: ${upErr.message}`, data: null };
    }

    const { data: signedData, error: signErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(objectPath, 60 * 60 * 24 * 365);

    if (signErr || !signedData?.signedUrl) {
      console.error('Payout signed URL error:', signErr);
      return { status: 502, msg: 'File uploaded but could not generate view URL.', data: null };
    }

    const { error: updErr } = await db
      .from('bookings')
      .update({
        payout_status: 'sent',
        payout_transaction_id: normalizedTxn,
        payout_proof_url: signedData.signedUrl,
        payout_confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updErr) {
      console.error('Booking payout update error:', updErr);
      return { status: 500, msg: 'Failed to record payout', data: null };
    }

    const sellerAuthUserId = booking.service?.user_id;
    const serviceTitle = booking.service?.title || 'Service';

    try {
      const { sendPayoutSentToProvider } = await import('./emailService.js');
      sendPayoutSentToProvider(sellerAuthUserId, {
        bookingId,
        serviceTitle,
        amountGhs: booking.payment_amount,
        payoutTxnId: normalizedTxn,
      }).catch((e) => console.error('[email] payout sent notify failed:', e.message));
    } catch (emailErr) {
      console.error('[momo] payout email import failed:', emailErr?.message);
    }

    return {
      status: 200,
      msg: 'Payout confirmed. Provider has been notified.',
      data: { booking_id: bookingId, payout_status: 'sent' },
    };
  } catch (e) {
    console.error('adminConfirmPayout error:', e);
    return { status: 500, msg: 'Failed to confirm payout', data: null };
  }
}

export async function adminVerifyMomoPayment(bookingId, _adminUserId, approve, rejectionReason) {
  try {
    if (!bookingId) {
      return { status: 400, msg: 'Booking ID is required', data: null };
    }

    const db = supabaseAdmin || supabase;
    const { data: booking, error } = await db
      .from('bookings')
      .select(
        'id, buyer_id, service_id, payment_amount, payment_status, momo_transaction_id, payment_proof_url, service:services(user_id, title)'
      )
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { status: 404, msg: 'Booking not found', data: null };
    }

    if (booking.payment_status !== 'pending_review') {
      return {
        status: 400,
        msg: 'This booking is not awaiting MoMo verification',
        data: null,
      };
    }

    if (!approve) {
      const note = (rejectionReason || '').trim() || 'Payment could not be verified. Please resubmit proof.';
      const { error: rejErr } = await db
        .from('bookings')
        .update({
          payment_status: 'momo_rejected',
          payment_review_note: note,
          momo_transaction_id: null,
          payment_proof_url: null,
          momo_submitted_at: null,
          payment_method: null,
        })
        .eq('id', bookingId);

      if (rejErr) {
        console.error('Reject momo payment:', rejErr);
        return { status: 500, msg: 'Failed to reject payment', data: null };
      }

      try {
        const { data: svc } = await db
          .from('services')
          .select('title')
          .eq('id', booking.service_id)
          .maybeSingle();
        const { sendMomoPaymentRejectedToBuyer } = await import('./emailService.js');
        const emailResult = await sendMomoPaymentRejectedToBuyer(booking.buyer_id, {
          bookingId,
          serviceTitle: svc?.title || 'Service',
          rejectionReason: note,
        });
        return {
          status: 200,
          msg: 'Payment marked as not verified; buyer can submit again',
          data: {
            booking_id: bookingId,
            approved: false,
            buyerEmailSent: emailResult.sent === true,
            ...(emailResult.sent === false && emailResult.reason === 'no_email'
              ? { buyerEmailError: 'Buyer email not found' }
              : {}),
          },
        };
      } catch (emailErr) {
        console.error('[momo] Buyer rejection email failed:', emailErr?.message || emailErr);
        return {
          status: 200,
          msg: 'Payment marked as not verified; buyer can submit again',
          data: { booking_id: bookingId, approved: false, buyerEmailSent: false },
        };
      }
    }

    const reference = booking.momo_transaction_id;
    if (!reference) {
      return { status: 400, msg: 'Booking has no MoMo transaction ID', data: null };
    }

    const paidAt = new Date().toISOString();

    const { error: payErr } = await db
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_captured_at: paidAt,
        payment_transaction_id: reference,
        payment_review_note: null,
      })
      .eq('id', bookingId);

    if (payErr) {
      console.error('Approve momo payment:', payErr);
      return { status: 500, msg: 'Failed to confirm payment', data: null };
    }

    const invoiceNumber = await generateInvoiceNumber();
    const { data: invoice, error: invErr } = await db
      .from('invoices')
      .insert({
        booking_id: booking.id,
        buyer_id: booking.buyer_id,
        service_id: booking.service_id,
        amount: booking.payment_amount,
        currency: CURRENCY,
        invoice_number: invoiceNumber,
        paystack_reference: null,
        payment_reference: reference,
      })
      .select()
      .single();

    const serviceTitle = booking.service?.title || 'Service';
    const sellerAuthUserId = booking.service?.user_id;

    // Send buyer + seller emails (shared helper)
    const notifyApproval = async (invoiceId) => {
      try {
        const { sendMomoPaymentApprovedToBuyer, sendMomoApprovedToSeller } = await import('./emailService.js');
        const [buyerResult] = await Promise.allSettled([
          sendMomoPaymentApprovedToBuyer(booking.buyer_id, {
            bookingId,
            serviceTitle,
            amountGhs: booking.payment_amount,
            invoiceId,
          }),
          sellerAuthUserId
            ? sendMomoApprovedToSeller(sellerAuthUserId, {
                bookingId,
                serviceTitle,
                amountGhs: booking.payment_amount,
              })
            : Promise.resolve({ sent: false }),
        ]);
        return buyerResult.status === 'fulfilled' && buyerResult.value?.sent === true;
      } catch (e) {
        console.error('[momo] approval emails failed:', e?.message);
        return false;
      }
    };

    if (invErr) {
      console.error('Invoice create after momo approve:', invErr);
      const buyerEmailSent = await notifyApproval(null);
      return {
        status: 200,
        msg: 'Payment confirmed. Invoice creation failed — fix invoices.payment_reference if missing.',
        data: { booking_id: bookingId, invoice_id: null, approved: true, buyerEmailSent },
      };
    }

    const buyerEmailSent = await notifyApproval(invoice.id);

    return {
      status: 200,
      msg: 'Payment verified successfully',
      data: { booking_id: bookingId, invoice_id: invoice.id, approved: true, buyerEmailSent },
    };
  } catch (e) {
    console.error('adminVerifyMomoPayment error:', e);
    return { status: 500, msg: 'Failed to verify payment', data: null };
  }
}
