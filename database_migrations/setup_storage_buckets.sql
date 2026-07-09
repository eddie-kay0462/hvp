-- Storage buckets + RLS policies (mirrors production).
-- Run in the Supabase SQL Editor of any project that's missing them (e.g. staging).
-- Idempotent: safe to re-run.
--
-- Buckets (from production):
--   payment-proofs      private          (backend uploads via service role; signed URLs)
--   message-attachments public           (browser uploads to <uid>/... from ChatWindow)
--   service-images      public, 5MB cap  (browser uploads to <uid>/... from ListService/SellerServices)
--   portfolio-images    public           (browser uploads to portfolio/... from ConversationalSignup)

-- ---------------------------------------------------------------------------
-- 1. Buckets
-- ---------------------------------------------------------------------------

-- SEC-02: every bucket is image-only + size-capped. This blocks SVG/HTML/JS
-- uploads that would otherwise be served inline from the public buckets and
-- enable stored XSS. Raster formats only (no image/svg+xml — SVG can carry
-- script). payment-proofs matches the backend's ALLOWED_MIME (jpeg/png/webp).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-proofs',      'payment-proofs',      false, 5242880,  array['image/jpeg','image/png','image/webp']),
  ('message-attachments', 'message-attachments', true,  10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('service-images',      'service-images',      true,  5242880,  array['image/jpeg','image/png','image/webp','image/gif']),
  ('portfolio-images',    'portfolio-images',    true,  5242880,  array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. service-images — authenticated users manage files in their own <uid>/ folder
--    (same policies as FIX_STORAGE_POLICIES.sql)
-- ---------------------------------------------------------------------------

drop policy if exists "Users can upload service images" on storage.objects;
drop policy if exists "Public can view service images" on storage.objects;
drop policy if exists "Users can update their own service images" on storage.objects;
drop policy if exists "Users can delete their own service images" on storage.objects;

create policy "Users can upload service images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'service-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public can view service images"
on storage.objects for select to public
using (bucket_id = 'service-images');

create policy "Users can update their own service images"
on storage.objects for update to authenticated
using (
  bucket_id = 'service-images' and
  (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'service-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own service images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'service-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- 3. message-attachments — same <uid>/ folder pattern (ChatWindow.tsx)
-- ---------------------------------------------------------------------------

drop policy if exists "Users can upload message attachments" on storage.objects;
drop policy if exists "Public can view message attachments" on storage.objects;
drop policy if exists "Users can update their own message attachments" on storage.objects;
drop policy if exists "Users can delete their own message attachments" on storage.objects;

create policy "Users can upload message attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'message-attachments' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public can view message attachments"
on storage.objects for select to public
using (bucket_id = 'message-attachments');

create policy "Users can update their own message attachments"
on storage.objects for update to authenticated
using (
  bucket_id = 'message-attachments' and
  (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'message-attachments' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own message attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'message-attachments' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- 4. portfolio-images — ConversationalSignup uploads to a shared portfolio/
--    folder (paths are not uid-scoped), so inserts are allowed for any
--    authenticated user. Production currently has 0 policies on this bucket,
--    meaning browser uploads there can only work with these added.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can upload portfolio images" on storage.objects;
drop policy if exists "Public can view portfolio images" on storage.objects;

create policy "Authenticated users can upload portfolio images"
on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio-images');

create policy "Public can view portfolio images"
on storage.objects for select to public
using (bucket_id = 'portfolio-images');

-- ---------------------------------------------------------------------------
-- 5. payment-proofs — no policies needed for the app to function: the backend
--    uploads and signs URLs with the service role, which bypasses RLS. The
--    bucket stays private (no public read).
-- ---------------------------------------------------------------------------

-- Verify
select id, public, file_size_limit from storage.buckets order by id;
select policyname from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
