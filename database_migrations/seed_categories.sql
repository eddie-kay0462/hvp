-- =============================================================================
-- Platform categories seed (safe for any environment: dev, staging, prod)
-- =============================================================================
-- Categories are fixed platform data — the frontend (useCategories.ts) reads
-- them from public.categories, so every new environment must run this once.
-- Idempotent: ON CONFLICT (slug) upserts, so re-running only refreshes copy
-- and ordering. Contains no demo services/profiles (see seed_services.sql for
-- the dev-only services seed).
--
-- icon_name must be a key of iconMap in frontend CategoryGrid.tsx.
--
-- Run via Supabase SQL editor or:
--   psql "$DATABASE_URL" -f database_migrations/seed_categories.sql
-- =============================================================================

INSERT INTO public.categories (slug, name, description, icon_name, display_order, is_active)
VALUES
  (
    'tutoring',
    'Tutoring',
    'Academic tutoring and educational services',
    'BookOpen',
    1,
    true
  ),
  (
    'events_music',
    'Events & Music',
    'Event planning, DJ services, and music-related services',
    'Headphones',
    3,
    true
  ),
  (
    'food_baking',
    'Food & Baking',
    'Food preparation, baking, and culinary services',
    'Utensils',
    5,
    true
  ),
  (
    'beauty_hair',
    'Beauty & Hair',
    'Hair styling, beauty treatments, and grooming services',
    'Scissors',
    6,
    true
  ),
  (
    'design_creative',
    'Design & creative',
    'Logos, lookbooks, pattern-making, photography, and brand identity for streetwear labels.',
    'Pencil',
    10,
    true
  ),
  (
    'tech_dev',
    'Tech & dev',
    'NFC authentication, e-commerce builds, and digital product tooling for Ghana brands.',
    'Code',
    20,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;
