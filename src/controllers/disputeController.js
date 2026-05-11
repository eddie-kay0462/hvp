import { supabase, supabaseAdmin } from '../config/supabase.js';

const db = supabaseAdmin ?? supabase;

export const raiseDispute = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) return { status: 401, msg: 'Unauthorized', data: null };

    const { bookingId, reason, details } = req.body;
    if (!bookingId || !reason) {
      return { status: 400, msg: 'bookingId and reason are required', data: null };
    }

    // Verify user is buyer or seller on this booking
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select('id, buyer_id, status, service:services(user_id)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: 'Booking not found', data: null };
    }

    const isBuyer = booking.buyer_id === userId;
    const isSeller = booking.service?.user_id === userId;

    if (!isBuyer && !isSeller) {
      return { status: 403, msg: 'You are not a party to this booking', data: null };
    }

    const allowedStatuses = ['delivered', 'completed'];
    if (!allowedStatuses.includes(booking.status)) {
      return {
        status: 400,
        msg: 'Disputes can only be raised on delivered or recently completed bookings',
        data: null,
      };
    }

    // Check for existing open dispute
    const { data: existing } = await db
      .from('disputes')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      return { status: 409, msg: 'An open dispute already exists for this booking', data: null };
    }

    // Create dispute
    const { data: dispute, error: disputeError } = await db
      .from('disputes')
      .insert({ booking_id: bookingId, raised_by: userId, reason, details: details || null })
      .select()
      .single();

    if (disputeError) return { status: 400, msg: disputeError.message, data: null };

    // Flag the booking
    await db.from('bookings').update({ has_dispute: true }).eq('id', bookingId);

    // Notify admin (fire-and-forget)
    try {
      const { sendDisputeRaisedToAdmin } = await import('../services/emailService.js');
      if (typeof sendDisputeRaisedToAdmin === 'function') {
        sendDisputeRaisedToAdmin({ bookingId, disputeId: dispute.id, reason }).catch(() => {});
      }
    } catch (_) {}

    return { status: 201, msg: 'Dispute raised successfully', data: dispute };
  } catch (error) {
    console.error('raiseDispute error:', error);
    return { status: 500, msg: 'Failed to raise dispute', data: null };
  }
};

export const getAdminDisputes = async (req) => {
  try {
    const { status } = req.query;

    let query = db
      .from('disputes')
      .select(`
        id,
        booking_id,
        reason,
        details,
        status,
        admin_resolution,
        created_at,
        resolved_at,
        raised_by_profile:profiles!disputes_raised_by_fkey(first_name, last_name),
        booking:bookings(id, payment_amount, service:services(title))
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return { status: 400, msg: error.message, data: null };

    return { status: 200, msg: 'Disputes retrieved', data: data || [] };
  } catch (error) {
    console.error('getAdminDisputes error:', error);
    return { status: 500, msg: 'Failed to retrieve disputes', data: null };
  }
};

export const resolveDispute = async (req) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return { status: 401, msg: 'Unauthorized', data: null };

    const { disputeId } = req.params;
    const { resolution, newStatus } = req.body;

    if (!resolution) return { status: 400, msg: 'resolution text is required', data: null };
    const finalStatus = newStatus === 'closed' ? 'closed' : 'resolved';

    const { data, error } = await db
      .from('disputes')
      .update({
        status: finalStatus,
        admin_resolution: resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select('booking_id')
      .single();

    if (error) return { status: 400, msg: error.message, data: null };

    // Clear the flag on the booking
    await db.from('bookings').update({ has_dispute: false }).eq('id', data.booking_id);

    return { status: 200, msg: 'Dispute resolved', data };
  } catch (error) {
    console.error('resolveDispute error:', error);
    return { status: 500, msg: 'Failed to resolve dispute', data: null };
  }
};
