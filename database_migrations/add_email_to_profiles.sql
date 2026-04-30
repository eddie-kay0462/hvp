-- Add email column to profiles so seller email lookups don't require supabaseAdmin.
-- Run once against your production Supabase project via the SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Back-fill from auth.users for existing rows (requires service role / superuser).
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;
