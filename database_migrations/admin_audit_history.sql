-- Admin audit: MoMo proof lifecycle + service approve/reject history.
-- Run in Supabase SQL editor (after backup).

-- ---------------------------------------------------------------------------
-- MoMo: append-only verification events (receipt path lives in event metadata)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('submitted', 'approved', 'rejected')),
  actor_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_verification_events_created
  ON public.payment_verification_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_verification_events_booking
  ON public.payment_verification_events (booking_id);

COMMENT ON TABLE public.payment_verification_events IS 'Append-only log for MoMo proof submit / admin approve / reject';

-- ---------------------------------------------------------------------------
-- Services: approve / reject decision log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.service_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('approved', 'rejected')),
  admin_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  rejection_reason text,
  admin_notes text,
  service_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_moderation_events_created
  ON public.service_moderation_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_moderation_events_service
  ON public.service_moderation_events (service_id);

COMMENT ON TABLE public.service_moderation_events IS 'Admin approve/reject decisions for marketplace listings';
