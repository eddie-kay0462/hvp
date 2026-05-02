-- RPC to clear public.services in dev/staging seed runs.
-- WARNING: TRUNCATE ... CASCADE also truncates tables that reference services
-- (e.g. bookings, reviews, messages with service_id, invoices, conversations).
-- Run only on non-production databases after backup.

CREATE OR REPLACE FUNCTION public.truncate_services()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.services RESTART IDENTITY CASCADE;
END;
$$;

REVOKE ALL ON FUNCTION public.truncate_services() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.truncate_services() TO service_role;

COMMENT ON FUNCTION public.truncate_services() IS
  'Dev/staging only: truncates services and CASCADE-dependent rows. Not for production.';
