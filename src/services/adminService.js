import { supabase, supabaseAdmin } from '../config/supabase.js';

/**
 * Resolve seller display name and auth email (requires service role for email).
 */
async function getSellerContact(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', userId)
    .single();

  const fromProfile = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
  let sellerEmail = null;

  if (!supabaseAdmin) {
    console.error(
      '[admin] SUPABASE_SERVICE_ROLE_KEY is not set; cannot look up seller email for notifications.'
    );
    return {
      sellerEmail: null,
      sellerName: fromProfile || 'Seller',
    };
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userErr) {
    console.error('[admin] getUserById failed:', userErr.message);
    return {
      sellerEmail: null,
      sellerName: fromProfile || 'Seller',
    };
  }

  sellerEmail = userData?.user?.email ?? null;
  const sellerName = fromProfile || sellerEmail?.split('@')[0] || 'Seller';

  return { sellerEmail, sellerName };
}

/**
 * Get all pending services waiting for approval
 */
export const getPendingServices = async () => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_verified', false)
      .is('rejection_reason', null) // pending = not yet reviewed; rejected ones have a reason
      .order('created_at', { ascending: false });

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    const services = data || [];

    if (services.length === 0) {
      return { status: 200, msg: "Pending services retrieved", data: [] };
    }

    // Batch profile fetch — one query instead of N
    const userIds = [...new Set(services.map(s => s.user_id))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, profile_pic')
      .in('id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    // Batch email fetch via admin API — one call returns all users
    let emailMap = {};
    if (supabaseAdmin) {
      const emailRequests = userIds.map(id => supabaseAdmin.auth.admin.getUserById(id));
      const emailResults = await Promise.allSettled(emailRequests);
      emailResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          emailMap[userIds[idx]] = result.value?.data?.user?.email || null;
        }
      });
    }

    const servicesWithDetails = services.map(service => ({
      ...service,
      profiles: profileMap[service.user_id] || null,
      seller_email: emailMap[service.user_id] || null,
    }));

    return { status: 200, msg: "Pending services retrieved", data: servicesWithDetails };
  } catch (e) {
    console.error("Get pending services error:", e);
    return { status: 500, msg: "Failed to retrieve pending services", data: null };
  }
};

/**
 * Get all services (for admin view) with optional filters
 */
export const getAllServices = async (filters = {}) => {
  try {
    let query = supabase.from('services').select('*');

    if (filters.is_verified !== undefined) query = query.eq('is_verified', filters.is_verified);
    if (filters.is_active !== undefined)   query = query.eq('is_active', filters.is_active);
    if (filters.category)                   query = query.eq('category', filters.category);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    const services = data || [];

    if (services.length === 0) {
      return { status: 200, msg: "Services retrieved", data: [] };
    }

    // Batch profile fetch
    const userIds = [...new Set(services.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, profile_pic')
      .in('id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const servicesWithProfiles = services.map(service => ({
      ...service,
      profiles: profileMap[service.user_id] || null,
    }));

    return { status: 200, msg: "Services retrieved", data: servicesWithProfiles };
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

    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (fetchError || !service) {
      return { status: 404, msg: "Service not found", data: null };
    }

    const { sellerEmail, sellerName } = await getSellerContact(service.user_id);

    const { data, error } = await supabase
      .from('services')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: adminId,
        rejection_reason: null,
      })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return {
      status: 200,
      msg: "Service approved successfully",
      data: {
        service: data,
        sellerEmail,
        sellerName,
      },
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

    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (fetchError || !service) {
      return { status: 404, msg: "Service not found", data: null };
    }

    const { sellerEmail, sellerName } = await getSellerContact(service.user_id);

    const { data, error } = await supabase
      .from('services')
      .update({
        is_verified: false,
        rejection_reason: rejectionReason,
        admin_notes: adminNotes,
        verified_at: null,
        verified_by: null,
      })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return {
      status: 200,
      msg: "Service rejected",
      data: {
        service: data,
        sellerEmail,
        sellerName,
      },
    };
  } catch (e) {
    console.error("Reject service error:", e);
    return { status: 500, msg: "Failed to reject service", data: null };
  }
};

/**
 * Get service statistics — single query with aggregation
 */
export const getServiceStats = async () => {
  try {
    const [total, pending, approved, active] = await Promise.all([
      supabase.from('services').select('*', { count: 'exact', head: true }),
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_verified', false).is('rejection_reason', null),
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_verified', true).eq('is_active', true),
    ]);

    return {
      status: 200,
      msg: "Service statistics retrieved",
      data: {
        total: total.count || 0,
        pending: pending.count || 0,
        approved: approved.count || 0,
        active: active.count || 0,
      },
    };
  } catch (e) {
    console.error("Get service stats error:", e);
    return { status: 500, msg: "Failed to retrieve service statistics", data: null };
  }
};
