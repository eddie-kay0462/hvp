-- =============================================================================
-- Row Level Security policies — run on BOTH projects (staging + production)
-- =============================================================================
-- Access model:
--   • Browser (frontend/src/integrations/supabase/client.ts) uses the ANON key,
--     so it hits Postgres as role `anon` (logged out) or `authenticated`
--     (logged in). These are the roles RLS policies below apply to.
--   • Backend (src/**, SUPABASE_SERVICE_ROLE_KEY) uses the service role, which
--     BYPASSES RLS. So server-mediated writes (payments, payouts, moderation,
--     invoicing, booking lifecycle) need no policy — they keep working.
--
-- Therefore only the 8 tables the browser queries directly get policies:
--   categories, profiles, services, bookings, reviews, conversations,
--   messages, service_views.
-- The other tables (invoices, message_attachments, sellers, requests,
-- payment_verification_events, service_moderation_events) are server-only:
-- RLS stays enabled with NO browser policy, so the anon key can't touch them
-- while the service role continues to.
--
-- Idempotent: safe to re-run. Each table drops its policies then recreates.
-- =============================================================================


-- =============================================================================
-- categories — public catalog, read-only from browser. Seeded via service role
-- (database_migrations/seed_categories.sql).
-- =============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_public" ON public.categories;

CREATE POLICY "categories_select_public"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (COALESCE(is_active, true) IS TRUE);


-- =============================================================================
-- profiles — holds PII (email, phone). Public pages need name + avatar only.
-- Strategy: row-level SELECT is open (needed for seller names, message
-- participants, reviewer names everywhere), and PII is protected for the
-- PUBLIC with column-level grants:
--   • anon (logged-out public, the shipped key) may read only the safe display
--     columns — never email or phone.
--   • authenticated keeps full-table SELECT: logged-in users legitimately need
--     a counterparty's phone (BookingDetail) and own email prefs, and leaving
--     the table grant intact avoids a brittle per-column allow-list that would
--     break every time a column is added.
-- Postgres note: a TABLE-level SELECT grant overrides column-level REVOKEs, so
-- to restrict anon we revoke its table grant and re-grant only safe columns.
-- This requires anon `.select()` on profiles to name explicit safe columns; the
-- two former `.select('*')` reads (ServiceDetail, SellerProfile) were narrowed
-- to exactly these columns in the same change that introduced this migration.
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;

CREATE POLICY "profiles_select_all"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Column-level PII protection for the public (anon). authenticated is left with
-- its default full-table SELECT grant.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, first_name, last_name, profile_pic, role, created_at)
  ON public.profiles TO anon;


-- =============================================================================
-- services — marketplace catalog. (Mirrors services_rls.sql; kept here so this
-- one file fully provisions a fresh project.)
-- =============================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_public_live"     ON public.services;
DROP POLICY IF EXISTS "services_select_own_all_states"  ON public.services;
DROP POLICY IF EXISTS "services_insert_own"             ON public.services;
DROP POLICY IF EXISTS "services_update_own"             ON public.services;
DROP POLICY IF EXISTS "services_delete_own"             ON public.services;

CREATE POLICY "services_select_public_live"
ON public.services
FOR SELECT
TO anon, authenticated
USING (is_verified IS TRUE AND COALESCE(is_active, true) IS TRUE);

CREATE POLICY "services_select_own_all_states"
ON public.services
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "services_insert_own"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "services_update_own"
ON public.services
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "services_delete_own"
ON public.services
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- =============================================================================
-- bookings — browser reads only (writes go through the backend/service role).
-- A user may read a booking if they are the buyer, or the seller who owns the
-- booked service.
-- =============================================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_participant" ON public.bookings;

CREATE POLICY "bookings_select_participant"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  auth.uid() = buyer_id
  OR EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = bookings.service_id
      AND s.user_id = auth.uid()
  )
);


-- =============================================================================
-- reviews — publicly readable (shown on service/seller pages). A review may be
-- created only by its own reviewer.
-- =============================================================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own"    ON public.reviews;

CREATE POLICY "reviews_select_public"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "reviews_insert_own"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "reviews_update_own"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = reviewer_id);


-- =============================================================================
-- conversations + messages — participant-scoped. (Mirrors add_conversations_rls.sql.)
-- =============================================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;

CREATE POLICY "conversations_select_participant"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "conversations_insert_participant"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "conversations_update_participant"
ON public.conversations
FOR UPDATE
TO authenticated
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_sender"      ON public.messages;
DROP POLICY IF EXISTS "messages_update_participant" ON public.messages;

CREATE POLICY "messages_select_participant"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

CREATE POLICY "messages_insert_sender"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

CREATE POLICY "messages_update_participant"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);


-- =============================================================================
-- service_views — analytics pings inserted from the browser (anonymous or
-- logged in). Sellers read views for their OWN services (useSellerInsights.ts).
-- =============================================================================
ALTER TABLE public.service_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_views_insert_any"    ON public.service_views;
DROP POLICY IF EXISTS "service_views_select_owner"  ON public.service_views;

CREATE POLICY "service_views_insert_any"
ON public.service_views
FOR INSERT
TO anon, authenticated
WITH CHECK (viewer_id IS NULL OR auth.uid() = viewer_id);

-- Seller can read view records for services they own.
CREATE POLICY "service_views_select_owner"
ON public.service_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_views.service_id
      AND s.user_id = auth.uid()
  )
);


-- =============================================================================
-- Server-only tables — the browser never queries these directly. RLS is enabled
-- with NO policy, which denies the anon/authenticated roles while the backend
-- (service role) keeps full access. If a table ever needs a browser query,
-- add a scoped policy here.
-- =============================================================================
ALTER TABLE public.invoices                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_moderation_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_notifications       ENABLE ROW LEVEL SECURITY;
