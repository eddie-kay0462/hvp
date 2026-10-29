import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { getUserCommunities } from './communityService.js';
import {
  PORTFOLIO_MAX_ITEMS,
  validateContactInput,
  validatePortfolioInput,
} from './vendorProfileValidation.js';

// sellers and portfolio_items are server-only tables (no browser RLS policy).
const db = supabaseAdmin;

const MISCONFIGURED = { status: 500, msg: 'Server is missing SUPABASE_SERVICE_ROLE_KEY', data: null };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONTACT_COLUMNS =
  'bio, whatsapp_number, contact_phone, contact_email, instagram_handle, website_url';
const PORTFOLIO_COLUMNS =
  'id, title, description, image_urls, link_url, completed_on, position, created_at, updated_at';

const listPortfolio = async (userId) => {
  const { data, error } = await db
    .from('portfolio_items')
    .select(PORTFOLIO_COLUMNS)
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

const toContact = (seller) => ({
  bio: seller?.bio ?? null,
  whatsapp_number: seller?.whatsapp_number ?? null,
  contact_phone: seller?.contact_phone ?? null,
  contact_email: seller?.contact_email ?? null,
  instagram_handle: seller?.instagram_handle ?? null,
  website_url: seller?.website_url ?? null,
});

/**
 * Everything a vendor's public page needs: name, photo, bio, contact
 * channels, portfolio, communities and live services. Contact details are
 * public by design — on the campus sites they replace "Book Now", and the
 * vendor chooses which ones to fill in.
 */
export const getPublicVendorProfile = async (userId) => {
  try {
    if (!db) return MISCONFIGURED;
    if (!UUID_RE.test(String(userId))) {
      return { status: 404, msg: 'Vendor not found', data: null };
    }

    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, first_name, last_name, profile_pic, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return { status: 404, msg: 'Vendor not found', data: null };

    const [sellerRes, servicesRes, portfolio, communitiesRes] = await Promise.all([
      db.from('sellers').select(`title, ${CONTACT_COLUMNS}`).eq('user_id', userId).maybeSingle(),
      db
        .from('services')
        .select(
          'id, title, category, image_urls, pricing_type, default_price, price_min, price_max, created_at'
        )
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_verified', true)
        .order('created_at', { ascending: false }),
      listPortfolio(userId),
      getUserCommunities(userId),
    ]);
    if (sellerRes.error) throw sellerRes.error;
    if (servicesRes.error) throw servicesRes.error;

    const seller = sellerRes.data;
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

    return {
      status: 200,
      msg: 'Vendor profile retrieved',
      data: {
        user_id: profile.id,
        display_name: fullName || seller?.title || 'Vendor',
        profile_pic: profile.profile_pic ?? null,
        member_since: profile.created_at,
        ...toContact(seller),
        portfolio,
        services: servicesRes.data || [],
        communities: communitiesRes.status === 200 ? communitiesRes.data : [],
      },
    };
  } catch (e) {
    logger.error({ err: e, userId }, 'getPublicVendorProfile error');
    return { status: 500, msg: 'Failed to load vendor profile', data: null };
  }
};

/** The signed-in vendor's own editable profile (contact fields + portfolio). */
export const getMyVendorProfile = async (userId) => {
  try {
    if (!db) return MISCONFIGURED;

    const [sellerRes, portfolio, communitiesRes] = await Promise.all([
      db.from('sellers').select(CONTACT_COLUMNS).eq('user_id', userId).maybeSingle(),
      listPortfolio(userId),
      getUserCommunities(userId),
    ]);
    if (sellerRes.error) throw sellerRes.error;

    return {
      status: 200,
      msg: 'Profile retrieved',
      data: {
        ...toContact(sellerRes.data),
        portfolio,
        communities: communitiesRes.status === 200 ? communitiesRes.data : [],
      },
    };
  } catch (e) {
    logger.error({ err: e }, 'getMyVendorProfile error');
    return { status: 500, msg: 'Failed to load profile', data: null };
  }
};

export const updateMyContact = async (userId, body) => {
  try {
    if (!db) return MISCONFIGURED;

    const { data: changes, error: validationError } = validateContactInput(body);
    if (validationError) return { status: 400, msg: validationError, data: null };

    const { data: existing, error: findError } = await db
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (findError) throw findError;

    let result;
    if (existing) {
      result = await db
        .from('sellers')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select(CONTACT_COLUMNS)
        .single();
    } else {
      // Vendors can fill in contacts before listing a service. title,
      // description and category are NOT NULL; createService fills them the
      // same way when it auto-creates this row.
      const { data: profile } = await db
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .maybeSingle();
      const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
      result = await db
        .from('sellers')
        .insert({ user_id: userId, title: name || 'Seller', description: '', category: '', ...changes })
        .select(CONTACT_COLUMNS)
        .single();
    }
    if (result.error) {
      // CHECK constraint violations are bad input that slipped past validation.
      if (result.error.code === '23514') return { status: 400, msg: 'Invalid contact details', data: null };
      throw result.error;
    }

    return { status: 200, msg: 'Contact details saved', data: toContact(result.data) };
  } catch (e) {
    logger.error({ err: e }, 'updateMyContact error');
    return { status: 500, msg: 'Failed to save contact details', data: null };
  }
};

export const createPortfolioItem = async (userId, body) => {
  try {
    if (!db) return MISCONFIGURED;

    const { data: item, error: validationError } = validatePortfolioInput(body, {
      userId,
      supabaseUrl: process.env.SUPABASE_URL,
    });
    if (validationError) return { status: 400, msg: validationError, data: null };

    const { count, error: countError } = await db
      .from('portfolio_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (countError) throw countError;
    if ((count || 0) >= PORTFOLIO_MAX_ITEMS) {
      return {
        status: 400,
        msg: `You can have up to ${PORTFOLIO_MAX_ITEMS} portfolio items. Remove one to add another.`,
        data: null,
      };
    }

    const { data, error } = await db
      .from('portfolio_items')
      .insert({ ...item, position: item.position ?? count ?? 0, user_id: userId })
      .select(PORTFOLIO_COLUMNS)
      .single();
    if (error) {
      if (error.code === '23514') return { status: 400, msg: 'Invalid portfolio item', data: null };
      throw error;
    }

    return { status: 201, msg: 'Portfolio item added', data };
  } catch (e) {
    logger.error({ err: e }, 'createPortfolioItem error');
    return { status: 500, msg: 'Failed to add portfolio item', data: null };
  }
};

export const updatePortfolioItem = async (userId, itemId, body) => {
  try {
    if (!db) return MISCONFIGURED;
    if (!UUID_RE.test(String(itemId))) {
      return { status: 404, msg: 'Portfolio item not found', data: null };
    }

    const { data: changes, error: validationError } = validatePortfolioInput(body, {
      userId,
      supabaseUrl: process.env.SUPABASE_URL,
      partial: true,
    });
    if (validationError) return { status: 400, msg: validationError, data: null };

    // Scoping by user_id means another vendor's item id simply isn't found.
    const { data, error } = await db
      .from('portfolio_items')
      .update(changes)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select(PORTFOLIO_COLUMNS)
      .maybeSingle();
    if (error) {
      if (error.code === '23514') return { status: 400, msg: 'Invalid portfolio item', data: null };
      throw error;
    }
    if (!data) return { status: 404, msg: 'Portfolio item not found', data: null };

    return { status: 200, msg: 'Portfolio item updated', data };
  } catch (e) {
    logger.error({ err: e, itemId }, 'updatePortfolioItem error');
    return { status: 500, msg: 'Failed to update portfolio item', data: null };
  }
};

export const deletePortfolioItem = async (userId, itemId) => {
  try {
    if (!db) return MISCONFIGURED;
    if (!UUID_RE.test(String(itemId))) {
      return { status: 404, msg: 'Portfolio item not found', data: null };
    }

    const { data, error } = await db
      .from('portfolio_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return { status: 404, msg: 'Portfolio item not found', data: null };

    return { status: 200, msg: 'Portfolio item deleted', data: { id: data.id } };
  } catch (e) {
    logger.error({ err: e, itemId }, 'deletePortfolioItem error');
    return { status: 500, msg: 'Failed to delete portfolio item', data: null };
  }
};
