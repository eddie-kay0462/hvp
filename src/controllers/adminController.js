import * as adminService from '../services/adminService.js';

/**
 * Get all pending services
 */
export const getPendingServices = async (req) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return { status: 401, msg: "Unauthorized", data: null };
    }

    // Check if user is admin
    if (userRole !== 'admin') {
      return { status: 403, msg: "Access denied. Admin privileges required.", data: null };
    }

    const result = await adminService.getPendingServices();
    return result;
  } catch (error) {
    console.error("Get pending services error:", error);
    return { status: 500, msg: "Failed to retrieve pending services", data: null };
  }
};

/**
 * Get all services with optional filters
 */
export const getAllServices = async (req) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return { status: 401, msg: "Unauthorized", data: null };
    }

    // Check if user is admin
    if (userRole !== 'admin') {
      return { status: 403, msg: "Access denied. Admin privileges required.", data: null };
    }

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

/**
 * Approve a service
 */
export const approveService = async (req) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return { status: 401, msg: "Unauthorized", data: null };
    }

    // Check if user is admin
    if (userRole !== 'admin') {
      return { status: 403, msg: "Access denied. Admin privileges required.", data: null };
    }

    const { serviceId } = req.params;

    if (!serviceId) {
      return { status: 400, msg: "Service ID is required", data: null };
    }

    const result = await adminService.approveService(serviceId, userId);

    // If approval successful, send email notification
    if (result.status === 200 && result.data?.sellerEmail) {
      // Import email service dynamically to avoid circular dependencies
      try {
        const { sendServiceApprovalEmail } = await import('../services/emailService.js');
        await sendServiceApprovalEmail(
          result.data.sellerEmail,
          result.data.sellerName,
          result.data.service
        );
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Don't fail the approval if email fails
      }
    }

    return result;
  } catch (error) {
    console.error("Approve service error:", error);
    return { status: 500, msg: "Failed to approve service", data: null };
  }
};

/**
 * Reject a service
 */
export const rejectService = async (req) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return { status: 401, msg: "Unauthorized", data: null };
    }

    // Check if user is admin
    if (userRole !== 'admin') {
      return { status: 403, msg: "Access denied. Admin privileges required.", data: null };
    }

    const { serviceId } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!serviceId) {
      return { status: 400, msg: "Service ID is required", data: null };
    }

    if (!rejectionReason) {
      return { status: 400, msg: "Rejection reason is required", data: null };
    }

    const result = await adminService.rejectService(serviceId, userId, rejectionReason, adminNotes);

    // If rejection successful, send email notification
    if (result.status === 200 && result.data?.sellerEmail) {
      try {
        const { sendServiceRejectionEmail } = await import('../services/emailService.js');
        await sendServiceRejectionEmail(
          result.data.sellerEmail,
          result.data.sellerName,
          result.data.service,
          rejectionReason
        );
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
        // Don't fail the rejection if email fails
      }
    }

    return result;
  } catch (error) {
    console.error("Reject service error:", error);
    return { status: 500, msg: "Failed to reject service", data: null };
  }
};

/**
 * Get service statistics
 */
export const getServiceStats = async (req) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return { status: 401, msg: "Unauthorized", data: null };
    }

    // Check if user is admin
    if (userRole !== 'admin') {
      return { status: 403, msg: "Access denied. Admin privileges required.", data: null };
    }

    const result = await adminService.getServiceStats();
    return result;
  } catch (error) {
    console.error("Get service stats error:", error);
    return { status: 500, msg: "Failed to retrieve service statistics", data: null };
  }
};

