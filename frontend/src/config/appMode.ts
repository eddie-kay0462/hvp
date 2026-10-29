/**
 * Which site this build is.
 *
 * VITE_APP_MODE is fixed at build time: the main marketplace (hustlevillage.app)
 * builds without it; each campus site (e.g. ashesi.hustlevillage.app) is a
 * separate Vercel project built from this same code with VITE_APP_MODE=<slug>.
 *
 * Campus sites are discovery-only: browse, vendor portfolios and contact
 * details. Bookings, payments and messaging stay on the main marketplace.
 */

export interface Campus {
  /** Matches communities.slug in the database and the subdomain. */
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
}

const CAMPUSES: Record<string, Campus> = {
  ashesi: {
    slug: "ashesi",
    name: "Ashesi University",
    shortName: "Ashesi",
    tagline: "Find and hire talented Ashesi students",
  },
};

const rawMode = import.meta.env.VITE_APP_MODE;
// Written so that when VITE_APP_MODE is unset, IS_CAMPUS is a constant `false`
// the bundler can see through — the main build then drops every campus-only
// import (CampusNavbar, CampusFooter, CampusApp) instead of shipping them.
const mode = rawMode && rawMode !== "main" ? rawMode : undefined;

if (mode && !CAMPUSES[mode]) {
  console.warn(`Unknown VITE_APP_MODE "${mode}" — falling back to the main marketplace.`);
}

/** The campus this build serves, or null for the main marketplace. */
export const CAMPUS: Campus | null = mode ? CAMPUSES[mode] ?? null : null;
export const IS_CAMPUS = !!mode && CAMPUS !== null;
