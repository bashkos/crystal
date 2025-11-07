# Supabase Storage Bucket Setup Guide

## Why You Need File Storage

The Crystal platform needs file storage for:
- **Profile Images** - User profile pictures
- **Company Logos** - Brand logos
- **Content Submissions** - Images, videos, and media files from influencers
- **Portfolio Items** - Influencer portfolio media
- **Message Attachments** - Files shared in messages
- **Thumbnails** - Preview images for videos

## Setting Up Supabase Storage Buckets

### Step 1: Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar

### Step 2: Create Storage Buckets

You need to create the following buckets:

#### 1. **profiles** bucket
- **Name:** `profiles`
- **Public:** ✅ Yes (for profile images and logos)
- **File size limit:** 5 MB
- **Allowed MIME types:** `image/jpeg, image/png, image/webp`

#### 2. **submissions** bucket
- **Name:** `submissions`
- **Public:** ❌ No (private, only accessible via signed URLs)
- **File size limit:** 100 MB (for videos)
- **Allowed MIME types:** `image/*, video/*`

#### 3. **portfolio** bucket
- **Name:** `portfolio`
- **Public:** ✅ Yes (for portfolio showcase)
- **File size limit:** 50 MB
- **Allowed MIME types:** `image/*, video/*`

#### 4. **attachments** bucket
- **Name:** `attachments`
- **Public:** ❌ No (private messages)
- **File size limit:** 25 MB
- **Allowed MIME types:** `*/*` (all file types)

### Step 3: Set Up Storage Policies (RLS)

For each bucket, you need to set up Row Level Security (RLS) policies:

#### For `profiles` bucket (Public Read, Authenticated Write):

```sql
-- Allow public read access
CREATE POLICY "Public profiles are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

-- Allow authenticated users to upload
CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);
```

#### For `submissions` bucket (Private, Contract-based access):

```sql
-- Allow users to upload submissions for their contracts
CREATE POLICY "Influencers can upload submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

-- Allow contract participants to view submissions
CREATE POLICY "Contract participants can view submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);
```

#### For `portfolio` bucket (Public Read, Authenticated Write):

```sql
-- Public read access
CREATE POLICY "Portfolio items are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

-- Authenticated users can upload
CREATE POLICY "Influencers can upload portfolio items"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio' AND
  auth.role() = 'authenticated'
);
```

#### For `attachments` bucket (Private, Message-based access):

```sql
-- Allow message participants to upload/view attachments
CREATE POLICY "Message participants can access attachments"
ON storage.objects FOR ALL
USING (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);
```

### Step 4: Add Environment Variables

Add these to your `.env.local`:

```env
# Supabase Storage
NEXT_PUBLIC_SUPABASE_STORAGE_URL=http://supabasekong-ekkowggsogww84gwgsowccso.31.97.34.56.sslip.io/storage/v1
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Note:** The service role key is different from the anon key and should be kept secret (server-side only).

### Step 5: Update Next.js Config

Update `next.config.js` to allow Supabase Storage images:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'res.cloudinary.com',
      'supabasekong-ekkowggsogww84gwgsowccso.31.97.34.56.sslip.io'
    ],
  },
}

module.exports = nextConfig
```

## Quick Setup Script

You can run this SQL in your Supabase SQL Editor to create all buckets and policies at once:

```sql
-- Create buckets (run these in Supabase Dashboard -> Storage -> New Bucket)
-- Or use Supabase CLI if available

-- Note: Buckets must be created via Dashboard or API, not SQL
-- But policies can be set via SQL:

-- Profiles bucket policies
CREATE POLICY IF NOT EXISTS "Public profiles are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

CREATE POLICY IF NOT EXISTS "Users can upload profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

-- Submissions bucket policies
CREATE POLICY IF NOT EXISTS "Influencers can upload submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

CREATE POLICY IF NOT EXISTS "Contract participants can view submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submissions' AND
  auth.role() = 'authenticated'
);

-- Portfolio bucket policies
CREATE POLICY IF NOT EXISTS "Portfolio items are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

CREATE POLICY IF NOT EXISTS "Influencers can upload portfolio items"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio' AND
  auth.role() = 'authenticated'
);

-- Attachments bucket policies
CREATE POLICY IF NOT EXISTS "Message participants can access attachments"
ON storage.objects FOR ALL
USING (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);
```

## Testing Storage

After setup, test by uploading a file:

```javascript
// Example: Upload profile image
const { data, error } = await supabase.storage
  .from('profiles')
  .upload(`${userId}/avatar.jpg`, file)

if (error) {
  console.error('Upload error:', error)
} else {
  console.log('Upload successful:', data)
}
```

## Storage Limits

Check your Supabase plan limits:
- **Free tier:** 1 GB storage
- **Pro tier:** 100 GB storage
- Consider upgrading if you expect many large files

## Alternative: Keep Using Cloudinary

If you prefer Cloudinary:
1. Sign up at https://cloudinary.com
2. Get your credentials
3. Add to `.env.local`:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

## Recommended: Use Supabase Storage

Since you're already using Supabase for the database, using Supabase Storage is recommended because:
- ✅ Integrated with your existing setup
- ✅ Same authentication system
- ✅ Built-in CDN
- ✅ Automatic image optimization
- ✅ Simpler architecture

