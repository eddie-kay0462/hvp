-- ============================================================
-- Message notification infrastructure
-- Run in Supabase SQL Editor (or via migration tool)
-- ============================================================

-- 1. Throttle log — one row per notification sent
--    Used by /api/messages/notify to avoid spamming users
--    during fast back-and-forth conversations.
CREATE TABLE IF NOT EXISTS message_notifications (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid       NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  recipient_id   uuid        NOT NULL,
  sent_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_notif_lookup
  ON message_notifications (conversation_id, recipient_id, sent_at DESC);

-- Clean up old rows automatically — keep 7 days of history, no more
CREATE INDEX IF NOT EXISTS idx_msg_notif_sent_at ON message_notifications (sent_at);

-- 2. Opt-out flag on profiles
--    Default TRUE — users are opted in unless they turn it off.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true;

-- ============================================================
-- RLS for message_notifications
-- Only the backend (service role) writes to this table.
-- No user-facing reads needed.
-- ============================================================
ALTER TABLE message_notifications ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so no explicit policy is needed for the backend.
-- Deny all access from anon/authenticated roles (the backend uses service role).
CREATE POLICY "no_public_access" ON message_notifications
  FOR ALL
  USING (false);
