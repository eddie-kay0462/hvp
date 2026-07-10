import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Get all services with optional filters
 */
// Effective price used for price sort/filter: packages -> cheapest package,
// range/fixed -> default_price (null treated as 0, matching prior UI behaviour).
const effectivePrice = (s) => {
  if (s.pricing_type === 'packages' && Array.isArray(s.service_packages) && s.service_packages.length) {
    return Math.min(...s.service_packages.map((p) => Number(p.price) || 0));
  }
  return Number(s.default_price) || 0;
};

export const getAllServices = async (filters = {}) => {
  try {
    const {
      category,
      search,
      limit = 12,
      offset = 0,
      sortBy = 'recommended',
      priceMin,
      priceMax,
      minRating,
    } = filters;

    // Base fetch: all verified + active services matching category/search, newest
    // first. Sorting, price/rating filtering, and pagination are applied below so
    // they operate across the whole result set (not just the current page). A
    // generous safety cap avoids unbounded loads; denormalize ratings/price onto
    // services for DB-level pagination if the catalogue outgrows this.
    let query = supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .range(0, 999);

    if (category) {
      query = query.eq('category', category);
    }
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

    // Per-seller ratings (reviews are keyed by reviewee_id = seller). Attached to
    // each service so rating sort/filter and card display work.
    const ratingsMap = {};
    if (userIds.length > 0) {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('reviewee_id, rating')
        .in('reviewee_id', userIds);
      const acc = {};
      (reviews || []).forEach((r) => {
        (acc[r.reviewee_id] ||= []).push(Number(r.rating) || 0);
      });
      for (const [sellerId, ratings] of Object.entries(acc)) {
        ratingsMap[sellerId] = {
          average_rating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
          review_count: ratings.length,
        };
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
      
      const rating = ratingsMap[service.user_id] || null;

      // Always include seller object with display_name, even if seller entry doesn't exist
      return {
        ...service,
        average_rating: rating?.average_rating ?? null,
        review_count: rating?.review_count ?? 0,
        seller: seller ? {
          ...seller,
          display_name: displayName
        } : profile ? {
          user_id: service.user_id,
          display_name: displayName
        } : null
      };
    });

    // Filter + sort + paginate across the whole result set.
    let result = servicesWithSellers;

    if (priceMin != null || priceMax != null) {
      const lo = priceMin != null ? Number(priceMin) : 0;
      const hi = priceMax != null ? Number(priceMax) : Infinity;
      result = result.filter((s) => {
        const p = effectivePrice(s);
        return p >= lo && p <= hi;
      });
    }
    if (minRating != null) {
      result = result.filter((s) => (s.average_rating ?? 0) >= Number(minRating));
    }

    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case 'price_high':
        result.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case 'rating':
      case 'popular':
        result.sort(
          (a, b) =>
            (b.average_rating ?? 0) - (a.average_rating ?? 0) ||
            (b.review_count ?? 0) - (a.review_count ?? 0)
        );
        break;
      // 'newest' | 'recommended' | default: keep created_at desc from the base query.
      default:
        break;
    }

    const total = result.length;
    const page = result.slice(offset, offset + limit);

    return {
      status: 200,
      msg: 'Services retrieved successfully',
      data: {
        services: page,
        count: page.length,
        total,
        limit,
        offset,
      },
    };
  } catch (e) {
    logger.error('getAllServices error:', e);
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
      .eq('is_verified', true)
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
    logger.error('getServiceById error:', e);
    return { status: 500, msg: 'Failed to retrieve service', data: null };
  }
};