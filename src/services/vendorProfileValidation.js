/**
 * Input validation for vendor contact details and portfolio items.
 *
 * Pure functions (no DB) so they can be unit tested. Each returns
 * { data, error }: `data` holds only the fields that were sent, normalized and
 * ready to write; `error` is a user-facing message for the first bad field.
 *
 * Partial-update convention: a field that is `undefined` is left out (leave
 * unchanged); `null` or an empty string clears it.
 */

export const BIO_MAX = 1000;
export const PORTFOLIO_TITLE_MAX = 120;
export const PORTFOLIO_DESCRIPTION_MAX = 2000;
export const PORTFOLIO_MAX_IMAGES = 10;
export const PORTFOLIO_MAX_ITEMS = 30;

const COMMUNITY_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
const INSTAGRAM_RE = /^[A-Za-z0-9._]{1,30}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isBlank = (v) => v === null || (typeof v === 'string' && v.trim() === '');

export const isValidCommunitySlug = (slug) =>
  typeof slug === 'string' && slug.length <= 50 && COMMUNITY_SLUG_RE.test(slug);

/**
 * WhatsApp numbers are stored as international digits only (233241234567) so
 * the frontend can build wa.me links. A Ghanaian local number (0241234567) is
 * converted to +233.
 */
export const normalizeWhatsapp = (raw) => {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = `233${digits.slice(1)}`;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
};

/** Accepts "handle", "@handle" or an instagram.com profile URL. */
export const normalizeInstagram = (raw) => {
  let handle = String(raw).trim();
  const fromUrl = handle.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i);
  if (fromUrl) handle = fromUrl[1];
  handle = handle.replace(/^@/, '');
  return INSTAGRAM_RE.test(handle) ? handle : null;
};

/** http(s) URLs only; adds https:// when the scheme is missing. */
export const normalizeWebUrl = (raw) => {
  let value = String(raw).trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;
  if (value.length > 300) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
};

const CONTACT_FIELDS = {
  whatsapp_number: {
    normalize: normalizeWhatsapp,
    error: 'Enter a valid WhatsApp number, e.g. 0241234567 or +233241234567.',
  },
  contact_phone: {
    normalize: (v) => {
      const s = String(v).trim();
      return PHONE_RE.test(s) ? s : null;
    },
    error: 'Enter a valid phone number.',
  },
  contact_email: {
    normalize: (v) => {
      const s = String(v).trim().toLowerCase();
      return s.length <= 254 && EMAIL_RE.test(s) ? s : null;
    },
    error: 'Enter a valid email address.',
  },
  instagram_handle: {
    normalize: normalizeInstagram,
    error: 'Enter a valid Instagram handle, e.g. @yourname.',
  },
  website_url: {
    normalize: normalizeWebUrl,
    error: 'Enter a valid website link starting with http:// or https://.',
  },
};

export const validateContactInput = (body = {}) => {
  const data = {};

  if (body.bio !== undefined) {
    if (isBlank(body.bio)) {
      data.bio = null;
    } else {
      const bio = String(body.bio).trim();
      if (bio.length > BIO_MAX) {
        return { data: null, error: `Bio must be ${BIO_MAX} characters or fewer.` };
      }
      data.bio = bio;
    }
  }

  for (const [field, { normalize, error }] of Object.entries(CONTACT_FIELDS)) {
    if (body[field] === undefined) continue;
    if (isBlank(body[field])) {
      data[field] = null;
      continue;
    }
    const value = normalize(body[field]);
    if (value === null) return { data: null, error };
    data[field] = value;
  }

  if (Object.keys(data).length === 0) {
    return { data: null, error: 'No contact fields were provided.' };
  }
  return { data, error: null };
};

/** Public URL prefix that a user's portfolio uploads must start with. */
export const portfolioImagePrefix = (supabaseUrl, userId) =>
  `${String(supabaseUrl).replace(/\/+$/, '')}/storage/v1/object/public/portfolio-images/${userId}/`;

/**
 * @param {object} body
 * @param {{ userId: string, supabaseUrl: string, partial?: boolean }} opts
 *   partial: true for updates (title optional), false for creates.
 */
export const validatePortfolioInput = (body = {}, { userId, supabaseUrl, partial = false }) => {
  const data = {};

  if (body.title !== undefined || !partial) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return { data: null, error: 'Title is required.' };
    if (title.length > PORTFOLIO_TITLE_MAX) {
      return { data: null, error: `Title must be ${PORTFOLIO_TITLE_MAX} characters or fewer.` };
    }
    data.title = title;
  }

  if (body.description !== undefined) {
    if (isBlank(body.description)) {
      data.description = null;
    } else {
      const description = String(body.description).trim();
      if (description.length > PORTFOLIO_DESCRIPTION_MAX) {
        return {
          data: null,
          error: `Description must be ${PORTFOLIO_DESCRIPTION_MAX} characters or fewer.`,
        };
      }
      data.description = description;
    }
  }

  if (body.image_urls !== undefined) {
    const urls = body.image_urls ?? [];
    if (!Array.isArray(urls) || urls.some((u) => typeof u !== 'string')) {
      return { data: null, error: 'image_urls must be a list of links.' };
    }
    if (urls.length > PORTFOLIO_MAX_IMAGES) {
      return { data: null, error: `A portfolio item can have at most ${PORTFOLIO_MAX_IMAGES} images.` };
    }
    // Only images this user uploaded to our own bucket — no hotlinking
    // arbitrary URLs onto a public profile.
    const prefix = portfolioImagePrefix(supabaseUrl, userId);
    if (urls.some((u) => !u.startsWith(prefix) || u.includes('..'))) {
      return { data: null, error: 'Images must be uploaded through Hustle Village.' };
    }
    data.image_urls = urls;
  }

  if (body.link_url !== undefined) {
    if (isBlank(body.link_url)) {
      data.link_url = null;
    } else {
      const link = normalizeWebUrl(body.link_url);
      if (!link) return { data: null, error: 'Enter a valid link starting with http:// or https://.' };
      data.link_url = link;
    }
  }

  if (body.completed_on !== undefined) {
    if (isBlank(body.completed_on)) {
      data.completed_on = null;
    } else {
      const s = String(body.completed_on);
      const parsed = new Date(`${s}T00:00:00Z`);
      if (!DATE_RE.test(s) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== s) {
        return { data: null, error: 'completed_on must be a date like 2026-05-31.' };
      }
      data.completed_on = s;
    }
  }

  if (body.position !== undefined) {
    const position = Number(body.position);
    if (!Number.isInteger(position) || position < 0 || position > 10000) {
      return { data: null, error: 'position must be a whole number from 0 to 10000.' };
    }
    data.position = position;
  }

  if (partial && Object.keys(data).length === 0) {
    return { data: null, error: 'No fields were provided to update.' };
  }
  return { data, error: null };
};
