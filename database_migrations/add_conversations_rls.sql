-- ============================================================
-- RLS POLICIES FOR conversations AND messages TABLES
-- ============================================================
-- Run this in your Supabase SQL Editor.
-- Without these policies, all client-side queries (from the
-- browser) silently return empty arrays even when data exists.
-- ============================================================

-- ---- conversations ----
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_participant"  ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_participant"  ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant"  ON public.conversations;

-- Participants can read their own conversations
CREATE POLICY "conversations_select_participant"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  auth.uid() = participant1_id OR auth.uid() = participant2_id
);

-- Authenticated users can create conversations they're part of
CREATE POLICY "conversations_insert_participant"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = participant1_id OR auth.uid() = participant2_id
);

-- Participants can update (e.g. last_message_at via trigger)
CREATE POLICY "conversations_update_participant"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = participant1_id OR auth.uid() = participant2_id
);

-- ---- messages ----
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant"  ON public.messages;
DROP POLICY IF EXISTS "messages_insert_sender"       ON public.messages;
DROP POLICY IF EXISTS "messages_update_participant"  ON public.messages;

-- Participants in a conversation can read its messages
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

-- Only the sender can insert a message (sender_id must equal auth.uid())
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

-- Participants can update messages (for marking received messages as read)
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

-- ---- Trigger: keep conversations.last_message_at in sync ----
-- Creates/replaces a function that bumps last_message_at whenever
-- a new message is inserted.
CREATE OR REPLACE FUNCTION public.update_conversation_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_conversation_last_message_at ON public.messages;
CREATE TRIGGER trg_update_conversation_last_message_at
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message_at();
