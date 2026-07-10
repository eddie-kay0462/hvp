import { supabase, supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const db = supabaseAdmin ?? supabase;

const AUTO_RELEASE_HOURS = 72;

/**
 * Finds all bookings in 'delivered' status where delivered_at is older than
 * AUTO_RELEASE_HOURS hours, auto-confirms them, releases payment, and notifies
 * both parties. Runs on a schedule from server.js.
 */
export const runAutoRelease = async () => {
  try {
    const cutoff = new Date(Date.now() - AUTO_RELEASE_HOURS * 60 * 60 * 1000).toISOString();

    const { data: bookings, error } = await db
      .from('bookings')
      .select('id, buyer_id, payment_status, payment_amount, service:services(user_id, title)')
      .eq('status', 'delivered')
      .not('delivered_at', 'is', null)
      .lt('delivered_at', cutoff);

    if (error) {
      logger.error('[auto-release] query error:', error.message);
      return;
    }

    if (!bookings || bookings.length === 0) return;

    logger.info(`[auto-release] found ${bookings.length} booking(s) to auto-release`);

    for (const booking of bookings) {
      try {
        if (booking.payment_status !== 'paid') {
          logger.warn(`[auto-release] skipping booking ${booking.id} — payment_status is ${booking.payment_status}, not 'paid'`);
          continue;
        }

        const { releasePayment } = await import('./paymentService.js');
        const releaseResult = await releasePayment(booking.id);

        if (releaseResult.status !== 200) {
          logger.error(`[auto-release] payment release failed for booking ${booking.id}:`, releaseResult.msg);
          continue;
        }

        await db
          .from('bookings')
          .update({
            status: 'completed',
            payment_status: 'released',
            payment_released_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        logger.info(`[auto-release] completed booking ${booking.id}`);

        // Notify both parties (fire-and-forget)
        try {
          const { sendPaymentReleasedToSeller, sendPayoutRequiredToAdmin, sendAutoReleasedToBuyer } =
            await import('./emailService.js');
          const sellerAuthUserId = booking.service?.user_id;
          const serviceTitle = booking.service?.title;

          sendPaymentReleasedToSeller(sellerAuthUserId, {
            bookingId: booking.id,
            serviceTitle,
            amountGhs: booking.payment_amount,
          }).catch((e) => logger.error('[auto-release] seller email failed:', e.message));

          sendPayoutRequiredToAdmin(sellerAuthUserId, {
            bookingId: booking.id,
            serviceTitle,
            amountGhs: booking.payment_amount,
          }).catch((e) => logger.error('[auto-release] admin email failed:', e.message));

          // Notify buyer the payment was auto-released
          if (typeof sendAutoReleasedToBuyer === 'function') {
            sendAutoReleasedToBuyer(booking.buyer_id, {
              bookingId: booking.id,
              serviceTitle,
            }).catch((e) => logger.error('[auto-release] buyer email failed:', e.message));
          }
        } catch (e) {
          logger.error('[auto-release] email import failed:', e.message);
        }
      } catch (bookingErr) {
        logger.error(`[auto-release] error processing booking ${booking.id}:`, bookingErr.message);
      }
    }
  } catch (err) {
    logger.error('[auto-release] unexpected error:', err.message);
  }
};
