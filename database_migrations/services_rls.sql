-- Row Level Security for public.services (browser Supabase client + defense in depth).
-- Server API continues to work when SUPABASE_SERVICE_ROLE_KEY is set (bypasses RLS).

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_public_live" ON public.services;
DROP POLICY IF EXISTS "services_select_own_all_states" ON public.services;
DROP POLICY IF EXISTS "services_insert_own" ON public.services;
DROP POLICY IF EXISTS "services_update_own" ON public.services;
DROP POLICY IF EXISTS "services_delete_own" ON public.services;

-- Anonymous + logged-in users: marketplace catalog (verified & active only)
CREATE POLICY "services_select_public_live"
ON public.services
FOR SELECT
TO anon, authenticated
USING (is_verified IS TRUE AND COALESCE(is_active, true) IS TRUE);

-- Sellers (and buyers with account): full visibility of own listings (pending, rejected, inactive)
CREATE POLICY "services_select_own_all_states"
ON public.services
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "services_insert_own"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "services_update_own"
ON public.services
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "services_delete_own"
ON public.services
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
