-- =====================================================
-- SUPABASE STORAGE BUCKETS SETUP
-- Run this in your Supabase SQL Editor AFTER the main schema
-- =====================================================

-- Create images bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Create recordings bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Allow authenticated users to upload to their own folder in images bucket
CREATE POLICY "Users can upload images to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view images (they're public)
CREATE POLICY "Images are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to upload to their own folder in recordings bucket
CREATE POLICY "Users can upload recordings to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'recordings' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view recordings (they're public)
CREATE POLICY "Recordings are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recordings');

-- Allow users to delete their own recordings
CREATE POLICY "Users can delete their own recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'recordings' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
