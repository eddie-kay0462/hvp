import { supabase } from '../config/supabase.js';

/**
 * Get all services with optional filters
 */
export const getAllServices = async (filters = {}) => {
  try {
    const { category, search, limit = 50, offset = 0, sortBy = 'created_at', order = 'desc' } = filters;

    let query = supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true) // Only show verified services
      .order(sortBy, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply category filter if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Apply search filter if provided
    if (search) {
      const searchPattern = `%${search}%`;
      query = query.or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`);
    }

    const { data: services, error } = await query;

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    // Fetch sellers and profiles for all unique user_ids
    const userIds = [...new Set(services?.map(s => s.user_id) || [])];
    let sellersMap = {};
    let profilesMap = {};

    if (userIds.length > 0) {
      // Fetch sellers
      const { data: sellers, error: sellersError } = await supabase
        .from('sellers')
        .select('id, title, description, category, user_id')
        .in('user_id', userIds);

      if (!sellersError && sellers) {
        sellersMap = sellers.reduce((acc, seller) => {
          acc[seller.user_id] = seller;
          return acc;
        }, {});
      }

      // Fetch profiles as fallback for seller names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      if (!profilesError && profiles) {
        profilesMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
    }

    // Merge seller data with services, using profile name as fallback
    const servicesWithSellers = (services || []).map(service => {
      const seller = sellersMap[service.user_id] || null;
      const profile = profilesMap[service.user_id] || null;
      
      // Use profile name as seller display name, fallback to seller title, then 'Seller'
      let displayName = 'Seller';
      if (profile) {
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        displayName = fullName || seller?.title || 'Seller';
      } else if (seller?.title) {
        displayName = seller.title;
      }
      
      // Always include seller object with display_name, even if seller entry doesn't exist
      return {
        ...service,
        seller: seller ? {
          ...seller,
          display_name: displayName
        } : profile ? {
          user_id: service.user_id,
          display_name: displayName
        } : null
      };
    });

    return {
      status: 200,
      msg: 'Services retrieved successfully',
      data: {
        services: servicesWithSellers || [],
        count: servicesWithSellers?.length || 0,
        limit,
        offset
      }
    };
  } catch (e) {
    console.error('getAllServices error:', e);
    return { status: 500, msg: 'Failed to retrieve services', data: null };
  }
};

/**
 * Get service by ID
 */
export const getServiceById = async (serviceId) => {
  try {
    if (!serviceId) {
      return { status: 400, msg: 'Service ID is required', data: null };
    }

    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { status: 404, msg: 'Service not found', data: null };
      }
      return { status: 400, msg: error.message, data: null };
    }

    if (!service) {
      return { status: 404, msg: 'Service not found', data: null };
    }

    // Fetch seller data
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, title, description, category, user_id, portfolio')
      .eq('user_id', service.user_id)
      .single();

    // Fetch profile as fallback for seller name
    let displayName = 'Seller';
    if (!sellerError && seller) {
      displayName = seller.title || 'Seller';
    } else {
      // Fallback to profile if seller entry doesn't exist
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', service.user_id)
        .single();

      if (!profileError && profile) {
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        displayName = `${firstName} ${lastName}`.trim() || 'Seller';
      }
    }

    const serviceWithSeller = {
      ...service,
      seller: sellerError ? (displayName !== 'Seller' ? {
        user_id: service.user_id,
        display_name: displayName
      } : null) : {
        ...seller,
        display_name: displayName
      }
    };

    return {
      status: 200,
      msg: 'Service retrieved successfully',
      data: serviceWithSeller
    };
  } catch (e) {
    console.error('getServiceById error:', e);
    return { status: 500, msg: 'Failed to retrieve service', data: null };
  }
};