import * as adminService from '../services/adminService.js';
import {
  listPendingMomoPaymentsAdmin,
  listMomoPaymentHistoryAdmin,
  adminVerifyMomoPayment,
  adminConfirmPayout,
} from '../services/momoPaymentService.js';

export const getPendingServices = async (_req) => {
  try {
    const result = await adminService.getPendingServices();
    return result;
  } catch (error) {
    console.error("Get pending services error:", error);
    return { status: 500, msg: "Failed to retrieve pending services", data: null };
  }
};

export const getAllServices = async (req) => {
  try {
    const filters = {
      is_verified: req.query.is_verified !== undefined ? req.query.is_verified === 'true' : undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      category: req.query.category || undefined
    };
    const result = await adminService.getAllServices(filters);
    return result;
  } catch (error) {
    console.error("Get all services error:", error);
    return { status: 500, msg: "Failed to retrieve services", data: null };
  }
};

export const approveService = async (req) => {
  try {
    const adminId = req.user.id;
    const { serviceId } = req.params;

    if (!serviceId) {
      return { status: 400, msg: "Service ID is required", data: null };
    }

    const result = await adminService.approveService(serviceId, adminId);

    let emailSent = false;
    let emailError = null;

    if (result.status === 200) {
      if (result.data?.sellerEmail) {
        try {
          const { sendServiceApprovalEmail } = await import('../services/emailService.js');
          await sendServiceApprovalEmail(
            result.data.sellerEmail,
            result.data.sellerName,
            result.data.service
          );
          emailSent = true;
        } catch (err) {
          emailError = err.message || String(err);
          console.error("Failed to send approval email:", err);
        }
      } else {
        emailError =
          "Seller email could not be loaded. Ensure SUPABASE_SERVICE_ROLE_KEY is set on the server.";
        console.error("approveService: missing sellerEmail — notification not sent.");
      }

      return {
        ...result,
        data: {
          ...result.data,
          emailSent,
          ...(emailError ? { emailError } : {}),
        },
      };
    }

    return result;
  } catch (error) {
    console.error("Approve service error:", error);
    return { status: 500, msg: "Failed to approve service", data: null };
  }
};

export const rejectService = async (req) => {
  try {
    const adminId = req.user.id;
    const { serviceId } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!serviceId) {
      return { status: 400, msg: "Service ID is required", data: null };
    }

    if (!rejectionReason) {
      return { status: 400, msg: "Rejection reason is required", data: null };
    }

    const result = await adminService.rejectService(serviceId, adminId, rejectionReason, adminNotes);

    let emailSent = false;
    let emailError = null;

    if (result.status === 200) {
      if (result.data?.sellerEmail) {
        try {
          const { sendServiceRejectionEmail } = await import('../services/emailService.js');
          await sendServiceRejectionEmail(
            result.data.sellerEmail,
            result.data.sellerName,
            result.data.service,
            rejectionReason
          );
          emailSent = true;
        } catch (err) {
          emailError = err.message || String(err);
          console.error("Failed to send rejection email:", err);
        }
      } else {
        emailError =
          "Seller email could not be loaded. Ensure SUPABASE_SERVICE_ROLE_KEY is set on the server.";
      }

      return {
        ...result,
        data: {
          ...result.data,
          emailSent,
          ...(emailError ? { emailError } : {}),
        },
      };
    }

    return result;
  } catch (error) {
    console.error("Reject service error:", error);
    return { status: 500, msg: "Failed to reject service", data: null };
  }
};

export const getServiceStats = async (_req) => {
  try {
    const result = await adminService.getServiceStats();
    return result;
  } catch (error) {
    console.error("Get service stats error:", error);
    return { status: 500, msg: "Failed to retrieve service statistics", data: null };
  }
};

export const getPendingMomoPayments = async (_req) => {
  try {
    return await listPendingMomoPaymentsAdmin();
  } catch (error) {
    console.error("Get pending MoMo payments error:", error);
    return { status: 500, msg: "Failed to retrieve pending MoMo payments", data: null };
  }
};

export const getMomoPaymentHistory = async (req) => {
  try {
    const q = {
      limit: req.query.limit,
      offset: req.query.offset,
      event_type: req.query.event_type,
    };
    return await listMomoPaymentHistoryAdmin(q);
  } catch (error) {
    console.error("Get MoMo payment history error:", error);
    return { status: 500, msg: "Failed to retrieve payment history", data: null };
  }
};

export const getServiceModerationHistory = async (req) => {
  try {
    const q = {
      limit: req.query.limit,
      offset: req.query.offset,
      event_type: req.query.event_type,
    };
    return await adminService.getServiceModerationHistory(q);
  } catch (error) {
    console.error("Get service moderation history error:", error);
    return { status: 500, msg: "Failed to retrieve moderation history", data: null };
  }
};

export const verifyMomoPayment = async (req) => {
  try {
    const adminId = req.user?.id;
    const { bookingId } = req.params;
    const { approve, rejectionReason } = req.body || {};
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }
    if (typeof approve !== "boolean") {
      return { status: 400, msg: "approve (boolean) is required", data: null };
    }
    return await adminVerifyMomoPayment(bookingId, adminId, approve, rejectionReason);
  } catch (error) {
    console.error("Verify MoMo payment error:", error);
    return { status: 500, msg: "Failed to verify payment", data: null };
  }
};

export const getPendingPayouts = async (_req) => {
  try {
    const { supabaseAdmin, supabase } = await import('../config/supabase.js');
    const db = supabaseAdmin ?? supabase;

    const { data, error } = await db
      .from('bookings')
      .select(`
        id,
        payment_amount,
        payment_released_at,
        payout_status,
        delivered_at,
        service:services(title, user_id),
        seller_profile:profiles!bookings_buyer_id_fkey(first_name, last_name, phone)
      `)
      .eq('payment_status', 'released')
      .neq('payout_status', 'sent')
      .order('payment_released_at', { ascending: true });

    if (error) return { status: 400, msg: error.message, data: null };

    // Fetch seller (via service.user_id) profiles separately for accurate MoMo numbers
    const userIds = [...new Set((data || []).map(b => b.service?.user_id).filter(Boolean))];
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);
      (profiles || []).forEach(p => { profilesMap[p.id] = p; });
    }

    const enriched = (data || []).map(b => ({
      ...b,
      seller: profilesMap[b.service?.user_id] || null,
    }));

    return { status: 200, msg: 'Pending payouts retrieved', data: enriched };
  } catch (error) {
    console.error('getPendingPayouts error:', error);
    return { status: 500, msg: 'Failed to retrieve pending payouts', data: null };
  }
};

export const confirmPayout = async (req) => {
  try {
    const { bookingId } = req.params;
    const { payoutTransactionId } = req.body || {};
    const file = req.file;
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }
    return await adminConfirmPayout(bookingId, payoutTransactionId, file);
  } catch (error) {
    console.error("Confirm payout error:", error);
    return { status: 500, msg: "Failed to confirm payout", data: null };
  }
};
