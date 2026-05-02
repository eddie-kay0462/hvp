import * as adminService from '../services/adminService.js';
import {
  listPendingMomoPaymentsAdmin,
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
