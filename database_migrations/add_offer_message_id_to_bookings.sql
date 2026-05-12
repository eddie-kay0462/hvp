-- Link a booking back to the offer message that created it (nullable for non-offer bookings)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS offer_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;
