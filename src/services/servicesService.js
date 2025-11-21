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

    // Fetch sellers for all unique user_ids
    const userIds = [...new Set(services?.map(s => s.user_id) || [])];
    let sellersMap = {};

    if (userIds.length > 0) {
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
    }

    // Merge seller data with services
    const servicesWithSellers = (services || []).map(service => ({
      ...service,
      seller: sellersMap[service.user_id] || null
    }));

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

    const serviceWithSeller = {
      ...service,
      seller: sellerError ? null : seller
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