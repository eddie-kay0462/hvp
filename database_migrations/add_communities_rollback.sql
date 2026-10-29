-- Undo add_communities.sql. STAGING ONLY — this deletes every community,
-- membership, portfolio item and seller contact detail. Idempotent.
-- set_updated_at() is left in place: bookings_updated_at also uses it.

BEGIN;

DROP POLICY IF EXISTS "Users can delete their own portfolio images" ON storage.objects;

DROP TABLE IF EXISTS public.portfolio_items;
DROP TABLE IF EXISTS public.community_members;
DROP TABLE IF EXISTS public.communities;

ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_bio_length;
ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_website_url_format;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS bio;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS whatsapp_number;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS contact_phone;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS contact_email;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS instagram_handle;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS website_url;

COMMIT;
