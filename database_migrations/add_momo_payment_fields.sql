-- Mobile Money manual checkout: buyer submits txn ID + receipt screenshot; admin verifies.
-- Run in Supabase SQL editor after backup.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS momo_transaction_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_proof_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS momo_submitted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_review_note text DEFAULT NULL;

COMMENT ON COLUMN public.bookings.payment_method IS 'paystack | momo_manual';
COMMENT ON COLUMN public.bookings.payment_proof_url IS 'Public URL for receipt screenshot (Supabase Storage)';
COMMENT ON COLUMN public.bookings.payment_review_note IS 'Admin rejection reason or internal note';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_reference text DEFAULT NULL;

COMMENT ON COLUMN public.invoices.payment_reference IS 'MoMo transaction ID or other non-Paystack reference';

-- Optional: create Storage bucket "payment-proofs" (public read optional; prefer signed URLs in production)
-- Dashboard → Storage → New bucket → name: payment-proofs
-- Policies: allow authenticated upload via service role from API only; or public read off for private bucket
