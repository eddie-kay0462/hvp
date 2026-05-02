-- Track service detail-page views so sellers can see view -> booking conversion.
-- Insert is open to anon + authenticated visitors; only the service owner can read.

CREATE TABLE IF NOT EXISTS public.service_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  viewer_id uuid,
  session_id text,
  source text,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_views_pkey PRIMARY KEY (id),
  CONSTRAINT service_views_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE,
  CONSTRAINT service_views_viewer_id_fkey
    FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS service_views_service_id_idx
  ON public.service_views (service_id);
CREATE INDEX IF NOT EXISTS service_views_viewed_at_idx
  ON public.service_views (viewed_at);
CREATE INDEX IF NOT EXISTS service_views_service_id_viewed_at_idx
  ON public.service_views (service_id, viewed_at DESC);

COMMENT ON TABLE  public.service_views IS 'Page-view log for service detail pages, used for seller analytics.';
COMMENT ON COLUMN public.service_views.viewer_id  IS 'Authenticated viewer id, null for anonymous browsers.';
COMMENT ON COLUMN public.service_views.session_id IS 'Per-browser session id, used to debounce repeat views.';
COMMENT ON COLUMN public.service_views.source     IS 'document.referrer at view time, optional.';

ALTER TABLE public.service_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_views_insert_any"   ON public.service_views;
DROP POLICY IF EXISTS "service_views_select_owner" ON public.service_views;

-- Anyone (including anon) can record a view for a public service.
-- We pin viewer_id to the authenticated user when present, and never let
-- a caller spoof someone else's viewer_id.
CREATE POLICY "service_views_insert_any"
ON public.service_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (viewer_id IS NULL OR viewer_id = auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_views.service_id
  )
);

-- Only the service owner can read view rows for their listings.
CREATE POLICY "service_views_select_owner"
ON public.service_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_views.service_id
      AND s.user_id = auth.uid()
  )
);
