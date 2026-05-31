-- ============================================================
-- Conversation enrichment RPC + last_message_at trigger
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Keep conversations.last_message_at current on every message insert.
--    This is what makes the conversations realtime subscription sufficient —
--    the hook no longer needs an unfiltered messages subscription to detect
--    new messages.
CREATE OR REPLACE FUNCTION update_conversation_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message_at ON messages;
CREATE TRIGGER trigger_update_conversation_last_message_at
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message_at();

-- 2. Single-query replacement for the N+3 fetch loop in useConversations.
--    Returns one row per conversation with other_user and last_message as
--    nested JSON objects, plus the unread count — all joined server-side.
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id uuid)
RETURNS TABLE (
  id                      uuid,
  participant1_id         uuid,
  participant2_id         uuid,
  service_id              uuid,
  last_message_at         timestamptz,
  created_at              timestamptz,
  updated_at              timestamptz,
  other_user              json,
  last_message            json,
  unread_count            bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.service_id,
    c.last_message_at,
    c.created_at,
    c.updated_at,

    json_build_object(
      'id',          p.id,
      'first_name',  p.first_name,
      'last_name',   p.last_name,
      'profile_pic', p.profile_pic
    ) AS other_user,

    (
      SELECT json_build_object(
        'id',              m.id,
        'conversation_id', m.conversation_id,
        'sender_id',       m.sender_id,
        'content',         m.content,
        'is_read',         m.is_read,
        'read_at',         m.read_at,
        'created_at',      m.created_at,
        'attachments',     m.attachments,
        'link_url',        m.link_url,
        'offer_data',      m.offer_data,
        'offer_status',    m.offer_status
      )
      FROM messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) AS last_message,

    (
      SELECT COUNT(*)
      FROM messages m
      WHERE m.conversation_id = c.id
        AND m.is_read  = false
        AND m.sender_id != p_user_id
    ) AS unread_count

  FROM conversations c
  JOIN profiles p
    ON p.id = CASE
      WHEN c.participant1_id = p_user_id THEN c.participant2_id
      ELSE c.participant1_id
    END
  WHERE c.participant1_id = p_user_id
     OR c.participant2_id = p_user_id
  ORDER BY c.last_message_at DESC NULLS LAST
$$;
