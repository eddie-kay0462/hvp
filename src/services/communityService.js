import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { isValidCommunitySlug } from './vendorProfileValidation.js';
import { getCampusSiteUrl } from '../config/campusSites.js';

// community_members has no browser RLS policy, so these reads and writes need
// the service role.
const db = supabaseAdmin;

const MISCONFIGURED = { status: 500, msg: 'Server is missing SUPABASE_SERVICE_ROLE_KEY', data: null };

/** Active community by slug, or null. Throws on DB errors. */
const findActiveCommunity = async (slug) => {
  const { data, error } = await db
    .from('communities')
    .select('id, slug, name, short_name, tagline')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const getCommunity = async (slug) => {
  try {
    if (!db) return MISCONFIGURED;
    if (!isValidCommunitySlug(slug)) {
      return { status: 404, msg: 'Community not found', data: null };
    }

    const community = await findActiveCommunity(slug);
    if (!community) return { status: 404, msg: 'Community not found', data: null };

    const { count, error } = await db
      .from('community_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('community_id', community.id);
    if (error) throw error;

    return {
      status: 200,
      msg: 'Community retrieved',
      data: { ...community, member_count: count || 0 },
    };
  } catch (e) {
    logger.error({ err: e, slug }, 'getCommunity error');
    return { status: 500, msg: 'Failed to load community', data: null };
  }
};

/** Idempotent: joining a community you are already in succeeds. */
export const joinCommunity = async (userId, slug) => {
  try {
    if (!db) return MISCONFIGURED;
    if (!isValidCommunitySlug(slug)) {
      return { status: 404, msg: 'Community not found', data: null };
    }

    const community = await findActiveCommunity(slug);
    if (!community) return { status: 404, msg: 'Community not found', data: null };

    const { error } = await db
      .from('community_members')
      .upsert(
        { community_id: community.id, user_id: userId },
        { onConflict: 'community_id,user_id', ignoreDuplicates: true }
      );
    if (error) throw error;

    return { status: 200, msg: `Joined ${community.name}`, data: { community } };
  } catch (e) {
    logger.error({ err: e, slug }, 'joinCommunity error');
    return { status: 500, msg: 'Failed to join community', data: null };
  }
};

/** Communities a user belongs to, as [{ slug, name, short_name, joined_at }]. */
export const getUserCommunities = async (userId) => {
  try {
    if (!db) return MISCONFIGURED;

    const { data, error } = await db
      .from('community_members')
      .select('joined_at, communities!inner(slug, name, short_name, is_active)')
      .eq('user_id', userId)
      .eq('communities.is_active', true);
    if (error) throw error;

    const communities = (data || []).map(({ joined_at, communities: c }) => ({
      slug: c.slug,
      name: c.name,
      short_name: c.short_name,
      joined_at,
    }));
    return { status: 200, msg: 'Communities retrieved', data: communities };
  } catch (e) {
    logger.error({ err: e }, 'getUserCommunities error');
    return { status: 500, msg: 'Failed to load communities', data: null };
  }
};

/**
 * Base URL of the campus site a user belongs to (per CAMPUS_SITE_URLS), or
 * null for main-marketplace users. Never throws — email links fall back to
 * the main site.
 */
export const getCampusSiteUrlForUser = async (userId) => {
  if (!userId) return null;
  const result = await getUserCommunities(userId);
  if (result.status !== 200) return null;
  for (const { slug } of result.data) {
    const url = getCampusSiteUrl(slug);
    if (url) return url;
  }
  return null;
};

/** User ids of everyone in a community; used to filter the service catalog. */
export const getCommunityMemberIds = async (slug) => {
  try {
    if (!db) return MISCONFIGURED;
    if (!isValidCommunitySlug(slug)) {
      return { status: 404, msg: 'Community not found', data: null };
    }

    const community = await findActiveCommunity(slug);
    if (!community) return { status: 404, msg: 'Community not found', data: null };

    const { data, error } = await db
      .from('community_members')
      .select('user_id')
      .eq('community_id', community.id);
    if (error) throw error;

    return { status: 200, msg: 'Members retrieved', data: (data || []).map((m) => m.user_id) };
  } catch (e) {
    logger.error({ err: e, slug }, 'getCommunityMemberIds error');
    return { status: 500, msg: 'Failed to load community members', data: null };
  }
};
