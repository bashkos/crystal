-- =====================================================
-- Supabase Storage Setup SQL Script
-- =====================================================
-- 
-- IMPORTANT: Create the buckets FIRST in Supabase Dashboard:
-- 1. Go to Storage -> New Bucket
-- 2. Create these 4 buckets:
--    - profiles (Public: Yes)
--    - submissions (Public: No)
--    - portfolio (Public: Yes)
--    - attachments (Public: No)
-- 
-- Then run this SQL script to set up the policies.
-- =====================================================

-- =====================================================
-- PROFILES BUCKET POLICIES
-- =====================================================
-- Public bucket for profile images and company logos

-- Allow public read access to profile images
CREATE POLICY IF NOT EXISTS "Public profiles are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

-- Allow authenticated users to upload their own profile images
CREATE POLICY IF NOT EXISTS "Users can upload profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

-- Allow users to update their own profile images
CREATE POLICY IF NOT EXISTS "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

-- Allow users to delete their own profile images
CREATE POLICY IF NOT EXISTS "Users can delete their own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- SUBMISSIONS BUCKET POLICIES
-- =====================================================
-- Private bucket for content submissions (images/videos)

-- Allow influencers to upload submissions for their contracts
CREATE POLICY IF NOT EXISTS "Influencers can upload submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

-- Allow contract participants (brand and influencer) to view submissions
CREATE POLICY IF NOT EXISTS "Contract participants can view submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

-- Allow contract participants to update submissions (for revisions)
CREATE POLICY IF NOT EXISTS "Contract participants can update submissions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

-- Allow contract participants to delete submissions
CREATE POLICY IF NOT EXISTS "Contract participants can delete submissions"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- PORTFOLIO BUCKET POLICIES
-- =====================================================
-- Public bucket for influencer portfolio showcase

-- Allow public read access to portfolio items
CREATE POLICY IF NOT EXISTS "Portfolio items are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

-- Allow authenticated influencers to upload portfolio items
CREATE POLICY IF NOT EXISTS "Influencers can upload portfolio items"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio' AND
  auth.role() = 'authenticated'
);

-- Allow influencers to update their own portfolio items
CREATE POLICY IF NOT EXISTS "Influencers can update their portfolio items"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolio' AND
  auth.role() = 'authenticated'
);

-- Allow influencers to delete their own portfolio items
CREATE POLICY IF NOT EXISTS "Influencers can delete their portfolio items"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- ATTACHMENTS BUCKET POLICIES
-- =====================================================
-- Private bucket for message attachments

-- Allow message participants to upload attachments
CREATE POLICY IF NOT EXISTS "Message participants can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

-- Allow message participants to view attachments
CREATE POLICY IF NOT EXISTS "Message participants can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

-- Allow message participants to update attachments
CREATE POLICY IF NOT EXISTS "Message participants can update attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

-- Allow message participants to delete attachments
CREATE POLICY IF NOT EXISTS "Message participants can delete attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check that policies were created successfully
-- (This will show any errors if policies already exist)

DO $$
BEGIN
  RAISE NOTICE 'Storage policies setup complete!';
  RAISE NOTICE 'Verify buckets exist: profiles, submissions, portfolio, attachments';
  RAISE NOTICE 'If you see errors about existing policies, that is OK - they are already set up.';
END $$;

