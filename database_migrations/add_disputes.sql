CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL REFERENCES profiles(id),
  reason text NOT NULL,
  details text,
  evidence_urls text[],
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'closed')),
  admin_resolution text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- One active dispute per booking at a time
CREATE UNIQUE INDEX IF NOT EXISTS disputes_booking_open_idx
  ON disputes(booking_id)
  WHERE status = 'open';

-- Flag on bookings so payout logic can check it quickly
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS has_dispute boolean DEFAULT false;
