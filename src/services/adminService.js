import { supabase, supabaseAdmin } from '../config/supabase.js';

/**
 * Get all pending services waiting for approval
 */
export const getPendingServices = async () => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          phone,
          profile_pic
        )
      `)
      .eq('is_verified', false)
      .order('created_at', { ascending: false });

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    // Get seller emails from auth.users (requires admin client)
    const servicesWithEmails = await Promise.all(
      data.map(async (service) => {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(service.user_id);
        return {
          ...service,
          seller_email: userData?.user?.email || null
        };
      })
    );

    return { status: 200, msg: "Pending services retrieved", data: servicesWithEmails };
  } catch (e) {
    console.error("Get pending services error:", e);
    return { status: 500, msg: "Failed to retrieve pending services", data: null };
  }
};

/**
 * Get all services (for admin view)
 */
export const getAllServices = async (filters = {}) => {
  try {
    let query = supabase
      .from('services')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          phone,
          profile_pic
        )
      `);

    // Apply filters
    if (filters.is_verified !== undefined) {
      query = query.eq('is_verified', filters.is_verified);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return { status: 200, msg: "Services retrieved", data };
  } catch (e) {
    console.error("Get all services error:", e);
    return { status: 500, msg: "Failed to retrieve services", data: null };
  }
};

/**
 * Approve a service
 */
export const approveService = async (serviceId, adminId) => {
  try {
    if (!serviceId || !adminId) {
      return { status: 400, msg: "Service ID and Admin ID are required", data: null };
    }

    // Get service details for email notification
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('*, profiles:user_id(first_name, last_name)')
      .eq('id', serviceId)
      .single();

    if (fetchError || !service) {
      return { status: 404, msg: "Service not found", data: null };
    }

    // Update service to approved
    const { data, error } = await supabase
      .from('services')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: adminId,
        rejection_reason: null // Clear any previous rejection reason
      })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    // Get seller email for notification
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(service.user_id);
    const sellerEmail = userData?.user?.email;

    return { 
      status: 200, 
      msg: "Service approved successfully", 
      data: {
        service: data,
        sellerEmail,
        sellerName: `${service.profiles?.first_name || ''} ${service.profiles?.last_name || ''}`.trim()
      }
    };
  } catch (e) {
    console.error("Approve service error:", e);
    return { status: 500, msg: "Failed to approve service", data: null };
  }
};

/**
 * Reject a service
 */
export const rejectService = async (serviceId, adminId, rejectionReason, adminNotes = null) => {
  try {
    if (!serviceId || !adminId || !rejectionReason) {
      return { status: 400, msg: "Service ID, Admin ID, and rejection reason are required", data: null };
    }

    // Get service details for email notification
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('*, profiles:user_id(first_name, last_name)')
      .eq('id', serviceId)
      .single();

    if (fetchError || !service) {
      return { status: 404, msg: "Service not found", data: null };
    }

    // Update service with rejection
    const { data, error } = await supabase
      .from('services')
      .update({
        is_verified: false,
        rejection_reason: rejectionReason,
        admin_notes: adminNotes,
        verified_at: null,
        verified_by: null
      })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    // Get seller email for notification
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(service.user_id);
    const sellerEmail = userData?.user?.email;

    return { 
      status: 200, 
      msg: "Service rejected", 
      data: {
        service: data,
        sellerEmail,
        sellerName: `${service.profiles?.first_name || ''} ${service.profiles?.last_name || ''}`.trim()
      }
    };
  } catch (e) {
    console.error("Reject service error:", e);
    return { status: 500, msg: "Failed to reject service", data: null };
  }
};

/**
 * Get service statistics for admin dashboard
 */
export const getServiceStats = async () => {
  try {
    // Get total services
    const { count: totalServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });

    // Get pending services
    const { count: pendingServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', false);

    // Get approved services
    const { count: approvedServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);

    // Get active services
    const { count: activeServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true)
      .eq('is_active', true);

    return {
      status: 200,
      msg: "Service statistics retrieved",
      data: {
        total: totalServices || 0,
        pending: pendingServices || 0,
        approved: approvedServices || 0,
        active: activeServices || 0
      }
    };
  } catch (e) {
    console.error("Get service stats error:", e);
    return { status: 500, msg: "Failed to retrieve service statistics", data: null };
  }
};

