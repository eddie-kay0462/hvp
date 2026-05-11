-- RFQ pricing: range pricing on services + quote flow on bookings + unique title per seller

-- 1. Services: pricing type + range columns
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'fixed'
    CHECK (pricing_type IN ('fixed', 'range')),
  ADD COLUMN IF NOT EXISTS price_min numeric,
  ADD COLUMN IF NOT EXISTS price_max numeric;

-- 2. Services: unique title per seller (replaces application-level category duplicate check)
CREATE UNIQUE INDEX IF NOT EXISTS services_user_id_title_unique
  ON public.services (user_id, lower(title));

-- 3. Bookings: RFQ fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS buyer_requirements text,
  ADD COLUMN IF NOT EXISTS quoted_price numeric,
  ADD COLUMN IF NOT EXISTS seller_quote_note text,
  ADD COLUMN IF NOT EXISTS quote_status text
    CHECK (quote_status IN ('pending_quote', 'quote_sent', 'quote_accepted', 'quote_declined'));
