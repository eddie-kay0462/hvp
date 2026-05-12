-- Add offer support to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS offer_data JSONB,
  ADD COLUMN IF NOT EXISTS offer_status TEXT CHECK (offer_status IN ('pending', 'accepted', 'declined'));

-- Index for looking up pending offers
CREATE INDEX IF NOT EXISTS idx_messages_offer_status
  ON messages (offer_status)
  WHERE offer_status IS NOT NULL;
