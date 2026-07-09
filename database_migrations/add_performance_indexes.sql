-- =============================================================================
-- DB-01 — Secondary indexes on foreign-key / filter columns
-- Run on BOTH Supabase projects (staging + production). Idempotent.
-- =============================================================================
-- No table currently has secondary indexes, so every query filtering on an FK
-- (bookings by buyer/service, messages by conversation, etc.) seq-scans. RLS
-- policies compound this: each bookings read runs an EXISTS subquery against
-- services, and the auto-release job filters bookings on (status, delivered_at).
--
-- Purely additive — no code change, no behavioural change. On a table that
-- already holds production rows, prefer CREATE INDEX CONCURRENTLY (cannot run
-- inside a transaction / the SQL editor's implicit txn — run those lines one at
-- a time if the table is large). For empty/small staging tables plain CREATE is
-- fine.
--
-- PREREQUISITE: verify column names against the LIVE schema before running.
-- currdb.sql is labelled context-only and does NOT list bookings.delivered_at,
-- which the auto-release job references — confirm it exists (the composite index
-- below will error if it does not).
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_buyer     ON public.bookings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service   ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_release   ON public.bookings(status, delivered_at);
CREATE INDEX IF NOT EXISTS idx_services_user      ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_convo     ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p1   ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2   ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_service_views_svc  ON public.service_views(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee   ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service    ON public.reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking   ON public.invoices(booking_id);

-- Verify: list indexes just created.
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
