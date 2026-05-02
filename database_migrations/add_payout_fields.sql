-- Add admin payout tracking columns to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payout_status       text,
  ADD COLUMN IF NOT EXISTS payout_transaction_id text,
  ADD COLUMN IF NOT EXISTS payout_proof_url    text,
  ADD COLUMN IF NOT EXISTS payout_confirmed_at  timestamptz;

-- payout_status: null = not yet sent, 'sent' = admin has confirmed payout
COMMENT ON COLUMN bookings.payout_status        IS 'null = pending payout, sent = admin confirmed payout sent';
COMMENT ON COLUMN bookings.payout_transaction_id IS 'MoMo transaction ID from admin payout to provider';
COMMENT ON COLUMN bookings.payout_proof_url     IS 'Screenshot of admin MoMo receipt for payout';
COMMENT ON COLUMN bookings.payout_confirmed_at  IS 'Timestamp when admin confirmed payout sent';
