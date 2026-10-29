/**
 * Public URL of each campus site, per environment, so backend emails can link
 * campus vendors back to their own site instead of the main marketplace.
 *
 *   CAMPUS_SITE_URLS="ashesi=https://ashesi.hustlevillage.app"            (production)
 *   CAMPUS_SITE_URLS="ashesi=https://ashesi-staging.hustlevillage.app"    (staging)
 *
 * Comma-separated slug=url pairs; slugs match communities.slug. Unset means
 * every email links to FRONTEND_URL, as before.
 */

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** @returns {Record<string, string>} slug -> base URL without a trailing slash */
export const parseCampusSiteUrls = (raw = '') => {
  const sites = {};
  for (const pair of String(raw).split(',')) {
    const i = pair.indexOf('=');
    if (i === -1) continue;
    const slug = pair.slice(0, i).trim();
    const url = pair.slice(i + 1).trim().replace(/\/+$/, '');
    if (SLUG_RE.test(slug) && /^https?:\/\/[^\s/]+$/i.test(url)) sites[slug] = url;
  }
  return sites;
};

export const getCampusSiteUrl = (slug) =>
  parseCampusSiteUrls(process.env.CAMPUS_SITE_URLS)[slug] ?? null;
