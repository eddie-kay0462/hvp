-- Fix Storage RLS Policies for Image Uploads
-- Run this in your Supabase SQL Editor

-- First, check if the bucket exists and is public
-- If not, create it via the Supabase Dashboard:
-- Storage → Buckets → New Bucket
-- Name: service-images
-- Public: Yes

-- Step 1: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view service images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own service images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own service images" ON storage.objects;

-- Step 2: Create policy for authenticated users to upload images
-- This allows users to upload to folders named with their user ID
CREATE POLICY "Users can upload service images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 3: Create policy for public read access
-- This allows anyone to view service images
CREATE POLICY "Public can view service images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'service-images');

-- Step 4: Create policy for users to update their own images
CREATE POLICY "Users can update their own service images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'service-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 5: Create policy for users to delete their own images
CREATE POLICY "Users can delete their own service images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify the policies were created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

