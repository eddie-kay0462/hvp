-- Add packages support to services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_packages jsonb DEFAULT '[]'::jsonb;

-- Extend pricing_type to allow 'packages'
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_pricing_type_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_pricing_type_check
  CHECK (pricing_type IN ('fixed', 'range', 'packages'));

-- Track which package a buyer selected on a booking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS selected_package_name text;
