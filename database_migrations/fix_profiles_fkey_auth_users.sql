-- profiles.id must reference Supabase Auth (auth.users), not public.users.
-- Otherwise signup creates auth.users rows but profile insert fails with 23503.
--
-- Apply in Supabase SQL editor or via migration runner (superuser / service role).

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
