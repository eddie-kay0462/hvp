-- =============================================================================
-- SEC-01 — Prevent privilege escalation via self-service profile writes
-- Run on BOTH Supabase projects (staging + production). Idempotent.
-- =============================================================================
-- Problem: profiles_update_own / profiles_insert_own RLS policies scope writes
-- to the caller's own row (auth.uid() = id) but place NO restriction on WHICH
-- columns may be written. The backend reads admin status from profiles.role
-- (src/middleware/auth.js). So any logged-in user could, with the shipped anon
-- key, run:  supabase.from('profiles').update({ role: 'admin' }).eq('id', me)
-- and gain full admin access. A crafted INSERT on first sign-in was a second
-- vector (AuthCallback creates the profile row client-side).
--
-- Fix: column-scoped GRANTs for the anon/authenticated roles, mirroring the
-- SELECT column-grant pattern already used on this table in
-- enable_rls_policies.sql. The service role (backend) has its own grants and is
-- unaffected, so all server-mediated writes keep working. RLS row-scope stays.
--
-- NOTE: role's default is aligned to 'buyer' so client INSERTs (which no longer
-- send role — see AuthCallback.tsx change in the same commit) still land as
-- 'buyer', matching prior behaviour and the code's assumed default.
-- =============================================================================

-- Client inserts no longer name role; make the column default match the app's
-- assumed default so Google/first-time sign-ins remain 'buyer'.
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'buyer';

-- UPDATE — browser may edit only these non-privileged columns.
-- (Exact set the frontend writes: Profile.tsx + seller/SellerProfile.tsx.)
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;
GRANT  UPDATE (first_name, last_name, phone, profile_pic, email_notifications_enabled)
       ON public.profiles TO authenticated;

-- INSERT — browser may set only these columns; role falls through to the
-- default above and can no longer be injected. (AuthCallback.tsx set of columns
-- minus role.)
REVOKE INSERT ON public.profiles FROM authenticated;
REVOKE INSERT ON public.profiles FROM anon;
GRANT  INSERT (id, first_name, last_name, phone, profile_pic, email)
       ON public.profiles TO authenticated;

-- Verify: authenticated should have INSERT/UPDATE only on the granted columns.
SELECT privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'profiles' AND grantee = 'authenticated'
ORDER BY privilege_type, column_name;
