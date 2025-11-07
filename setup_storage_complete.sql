-- =====================================================
-- COMPLETE Supabase Storage Setup Script
-- =====================================================
-- 
-- This script sets up ALL storage policies for the Crystal platform.
-- 
-- PREREQUISITES:
-- 1. Create buckets in Supabase Dashboard -> Storage:
--    a. "profiles" - Public bucket
--    b. "submissions" - Private bucket  
--    c. "portfolio" - Public bucket
--    d. "attachments" - Private bucket
-- 
-- 2. Then run this SQL script in Supabase SQL Editor
-- =====================================================

-- Enable Row Level Security on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES BUCKET (Public)
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

-- Create policies for profiles bucket
CREATE POLICY "Public profiles are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- SUBMISSIONS BUCKET (Private)
-- =====================================================

DROP POLICY IF EXISTS "Influencers can upload submissions" ON storage.objects;
DROP POLICY IF EXISTS "Contract participants can view submissions" ON storage.objects;
DROP POLICY IF EXISTS "Contract participants can update submissions" ON storage.objects;
DROP POLICY IF EXISTS "Contract participants can delete submissions" ON storage.objects;

CREATE POLICY "Influencers can upload submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Contract participants can view submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Contract participants can update submissions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Contract participants can delete submissions"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- PORTFOLIO BUCKET (Public)
-- =====================================================

DROP POLICY IF EXISTS "Portfolio items are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Influencers can upload portfolio items" ON storage.objects;
DROP POLICY IF EXISTS "Influencers can update their portfolio items" ON storage.objects;
DROP POLICY IF EXISTS "Influencers can delete their portfolio items" ON storage.objects;

CREATE POLICY "Portfolio items are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

CREATE POLICY "Influencers can upload portfolio items"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Influencers can update their portfolio items"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolio' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Influencers can delete their portfolio items"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- ATTACHMENTS BUCKET (Private)
-- =====================================================

DROP POLICY IF EXISTS "Message participants can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Message participants can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Message participants can update attachments" ON storage.objects;
DROP POLICY IF EXISTS "Message participants can delete attachments" ON storage.objects;

CREATE POLICY "Message participants can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Message participants can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Message participants can update attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Message participants can delete attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Storage policies setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify buckets exist: profiles, submissions, portfolio, attachments';
  RAISE NOTICE '2. Test upload functionality';
  RAISE NOTICE '3. Add storage URL to .env.local if not already added';
END $$;

