-- =============================================================================
-- CQ-02 — Normalize profiles.role to the canonical set (buyer / seller / admin)
-- Run on BOTH Supabase projects (staging + production). Idempotent.
-- =============================================================================
-- The code uses only 'buyer', 'seller', 'admin' (no 'customer' literal exists
-- anywhere). But profiles.role historically defaulted to 'customer', so rows
-- created without an explicit role landed as 'customer' — a value that matches
-- no code branch and is actively rejected by booking creation
-- (bookingController.js: role !== 'buyer' && role !== 'seller').
--
-- restrict_profiles_privileged_columns.sql already changed the column DEFAULT to
-- 'buyer'. This migration fixes existing rows and guards against future drift.
--
-- IMPORTANT (prod ordering): the frontend already stopped sending role on Google
-- sign-up, so until restrict_profiles_privileged_columns.sql is applied on prod
-- (which sets the 'buyer' default), new prod Google sign-ups land as 'customer'.
-- Apply that migration and this one together on prod.
-- =============================================================================

-- Diagnostic: what role values currently exist? (review before/after)
SELECT role, count(*) AS n FROM public.profiles GROUP BY role ORDER BY n DESC;

-- Normalize legacy / missing roles to buyer.
UPDATE public.profiles
SET role = 'buyer'
WHERE role IS NULL OR role = 'customer';

-- Guard against future drift. Safe now that values are normalized above; if this
-- errors, an unexpected role value remains — inspect the diagnostic output above.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('buyer', 'seller', 'admin'));

-- Verify: should now be only buyer/seller/admin.
SELECT role, count(*) AS n FROM public.profiles GROUP BY role ORDER BY n DESC;
