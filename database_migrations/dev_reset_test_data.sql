-- =============================================================================
-- DEV / STAGING: wipe marketplace test data to start fresh (public schema)
-- Run in Supabase → SQL Editor. Review before running on production.
-- =============================================================================
-- Does NOT delete auth.users here (see bottom). After public cleanup, remove
-- users in Dashboard → Authentication, or sign up again with new emails.
-- =============================================================================

BEGIN;

-- Audit logs (if migration admin_audit_history.sql was applied)
DELETE FROM public.payment_verification_events;
DELETE FROM public.service_moderation_events;

-- Messaging (attachments before messages)
DELETE FROM public.message_attachments;
DELETE FROM public.messages;

DELETE FROM public.invoices;
DELETE FROM public.reviews;
DELETE FROM public.bookings;
DELETE FROM public.conversations;

-- Optional: service page analytics (if add_service_views.sql applied)
DELETE FROM public.service_views;

DELETE FROM public.services;
DELETE FROM public.requests;

-- Only if this table exists in your project (ignore error if it does not)
DELETE FROM public.sellers;

-- Profiles last among user-linked public rows (still tied to auth.users)
DELETE FROM public.profiles;

COMMIT;

-- =============================================================================
-- Auth: Supabase usually blocks simple DELETE FROM auth.users without cleaning
-- child tables. Easiest for a full reset:
--   Dashboard → Authentication → Users → delete each test user
--
-- Advanced (postgres role only — may fail on hosted tiers; use Dashboard if so):
--
--   DELETE FROM auth.identities;
--   DELETE FROM auth.sessions;
--   DELETE FROM auth.refresh_tokens;
--   DELETE FROM auth.mfa_factors;
--   DELETE FROM auth.users;
--
-- =============================================================================
-- Storage: empty receipt bucket manually if you care about orphaned files:
--   Dashboard → Storage → payment-proofs → select all → delete
-- =============================================================================
