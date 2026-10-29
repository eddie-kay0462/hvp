-- =============================================================================
-- Communities (campus storefronts) + vendor portfolios + vendor contact info
-- Run on BOTH Supabase projects (staging first, then production). Idempotent.
-- Undo on staging with add_communities_rollback.sql.
-- =============================================================================
-- Powers the discovery-only campus sites (first: ashesi.hustlevillage.app).
-- Payments happen off-platform there, so a vendor's page is their portfolio
-- plus ways to contact them.
--
-- Purely additive: new tables and new nullable columns on sellers. Nothing
-- existing is renamed, dropped or tightened, so the main marketplace is
-- unaffected.
--
--   communities        one row per campus; public, read-only from the browser
--   community_members  which users belong to which community (any email can join)
--   portfolio_items    a vendor's past work, shown on their public page
--   sellers.*          contact channels shown in place of "Book Now"
--
-- community_members and portfolio_items follow the sellers pattern: RLS on
-- with no browser policy, so only the backend (service role) reads/writes them.
-- Services keep the existing admin approval flow (is_verified).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. communities
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  short_name text,
  tagline text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communities_pkey PRIMARY KEY (id),
  CONSTRAINT communities_slug_key UNIQUE (slug),
  CONSTRAINT communities_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

COMMENT ON TABLE  public.communities IS 'Campus communities, each served on its own subdomain (<slug>.hustlevillage.app).';
COMMENT ON COLUMN public.communities.slug IS 'Matches the subdomain and the frontend VITE_APP_MODE value.';

INSERT INTO public.communities (slug, name, short_name, tagline)
VALUES ('ashesi', 'Ashesi University', 'Ashesi', 'Find and hire talented Ashesi students')
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. community_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_members (
  community_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_members_pkey PRIMARY KEY (community_id, user_id),
  CONSTRAINT community_members_community_id_fkey
    FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT community_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- The PK covers lookups by community; this covers "which communities is X in".
CREATE INDEX IF NOT EXISTS community_members_user_id_idx
  ON public.community_members (user_id);

COMMENT ON TABLE public.community_members IS 'Users who joined a community, e.g. by signing up or listing on its subdomain.';

-- -----------------------------------------------------------------------------
-- 3. portfolio_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  image_urls text[] NOT NULL DEFAULT '{}',
  link_url text,
  completed_on date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_items_pkey PRIMARY KEY (id),
  CONSTRAINT portfolio_items_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT portfolio_items_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT portfolio_items_description_length CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT portfolio_items_image_count CHECK (cardinality(image_urls) <= 10),
  CONSTRAINT portfolio_items_link_url_format CHECK (link_url IS NULL OR link_url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS portfolio_items_user_id_position_idx
  ON public.portfolio_items (user_id, position, created_at DESC);

COMMENT ON TABLE  public.portfolio_items IS 'Past work a vendor shows on their public profile.';
COMMENT ON COLUMN public.portfolio_items.image_urls IS 'Public URLs in the portfolio-images bucket, under <user_id>/.';
COMMENT ON COLUMN public.portfolio_items.position IS 'Display order, ascending; ties fall back to newest first.';

-- Same trigger function as add_bookings_updated_at.sql; redefined so this file
-- runs on its own.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS portfolio_items_updated_at ON public.portfolio_items;
CREATE TRIGGER portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. sellers — contact channels (all optional)
-- -----------------------------------------------------------------------------
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS website_url text;

ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_bio_length;
ALTER TABLE public.sellers ADD CONSTRAINT sellers_bio_length
  CHECK (bio IS NULL OR char_length(bio) <= 1000);

ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_website_url_format;
ALTER TABLE public.sellers ADD CONSTRAINT sellers_website_url_format
  CHECK (website_url IS NULL OR website_url ~* '^https?://');

COMMENT ON COLUMN public.sellers.whatsapp_number  IS 'International format, digits only (e.g. 233241234567), for wa.me links.';
COMMENT ON COLUMN public.sellers.instagram_handle IS 'Handle without the @.';

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.communities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items   ENABLE ROW LEVEL SECURITY;

-- communities: anyone can read active communities; no browser writes.
DROP POLICY IF EXISTS "communities_select_active" ON public.communities;
CREATE POLICY "communities_select_active"
ON public.communities
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

-- community_members, portfolio_items: server-only (no browser policy).

-- -----------------------------------------------------------------------------
-- 6. Storage — let vendors delete their own portfolio images
-- -----------------------------------------------------------------------------
-- setup_storage_buckets.sql already allows authenticated upload + public read
-- on portfolio-images. Portfolio uploads go under <user_id>/, so scope delete
-- to that folder.
DROP POLICY IF EXISTS "Users can delete their own portfolio images" ON storage.objects;
CREATE POLICY "Users can delete their own portfolio images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'portfolio-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;

-- -----------------------------------------------------------------------------
-- Verify: expect 1 community (ashesi), 0 members, 0 portfolio items,
-- and 6 new sellers columns.
-- -----------------------------------------------------------------------------
SELECT
  (SELECT string_agg(slug, ', ') FROM public.communities)  AS communities,
  (SELECT count(*) FROM public.community_members)          AS members,
  (SELECT count(*) FROM public.portfolio_items)            AS portfolio_items,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sellers'
      AND column_name IN ('bio','whatsapp_number','contact_phone',
                          'contact_email','instagram_handle','website_url')
  )                                                         AS new_seller_columns;
