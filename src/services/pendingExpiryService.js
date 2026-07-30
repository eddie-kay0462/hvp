import { supabase, supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const db = supabaseAdmin ?? supabase;

const PENDING_EXPIRY_HOURS = 48;

/**
 * Cancels bookings left in 'pending' for longer than PENDING_EXPIRY_HOURS and
 * notifies both parties. Runs on a schedule from server.js.
 *
 * A pending booking can only be advanced by the seller accepting it — the buyer
 * cannot pay until then — so without this a seller who never opens their
 * dashboard leaves the buyer waiting forever with no recourse.
 *
 * Cancelled rather than a dedicated 'expired' status because the bookings.status
 * CHECK constraint only permits the six existing values; adding one needs a
 * migration.
 */
export const runPendingExpiry = async () => {
  try {
    const cutoff = new Date(Date.now() - PENDING_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const { data: bookings, error } = await db
      .from('bookings')
      .select('id, buyer_id, created_at, service:services(user_id, title)')
      .eq('status', 'pending')
      .lt('created_at', cutoff);

    if (error) {
      logger.error('[pending-expiry] query error:', error.message);
      return;
    }

    if (!bookings || bookings.length === 0) return;

    logger.info(`[pending-expiry] found ${bookings.length} unanswered booking(s) to cancel`);

    for (const booking of bookings) {
      try {
        // Guard against a seller accepting between the query and this write.
        const { data: updated, error: updateError } = await db
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', booking.id)
          .eq('status', 'pending')
          .select('id')
          .maybeSingle();

        if (updateError) {
          logger.error(`[pending-expiry] failed to cancel booking ${booking.id}:`, updateError.message);
          continue;
        }

        if (!updated) {
          logger.info(`[pending-expiry] booking ${booking.id} left pending before cancel — skipping`);
          continue;
        }

        logger.info(`[pending-expiry] cancelled booking ${booking.id} (created ${booking.created_at})`);

        // Notify both parties — neither of them triggered this (fire-and-forget)
        try {
          const { sendBookingCancelledToBuyer, sendBookingCancelledToSeller } =
            await import('./emailService.js');
          const serviceTitle = booking.service?.title;

          sendBookingCancelledToBuyer(booking.buyer_id, { serviceTitle })
            .catch((e) => logger.error('[pending-expiry] buyer email failed:', e.message));

          sendBookingCancelledToSeller(booking.service?.user_id, { serviceTitle, buyerName: null })
            .catch((e) => logger.error('[pending-expiry] seller email failed:', e.message));
        } catch (e) {
          logger.error('[pending-expiry] email import failed:', e.message);
        }
      } catch (bookingErr) {
        logger.error(`[pending-expiry] error processing booking ${booking.id}:`, bookingErr.message);
      }
    }
  } catch (err) {
    logger.error('[pending-expiry] unexpected error:', err.message);
  }
};
