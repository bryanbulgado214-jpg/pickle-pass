-- ============================================
-- Storage Security Policies
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Profile photos: authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own profile photo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile photo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can delete their own profile photo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Post media: authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own post media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Users can delete their own post media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Court photos: court owners can upload, anyone can view
CREATE POLICY "Anyone can view court photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'court-photos');

CREATE POLICY "Authenticated users can upload court photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'court-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete court photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'court-photos'
    AND auth.role() = 'authenticated'
  );

-- ============================================
-- Add profile columns for onboarding
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skill_level text,
  ADD COLUMN IF NOT EXISTS hometown text;
