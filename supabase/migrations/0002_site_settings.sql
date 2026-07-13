-- ============================================================================
-- SITE SETTINGS: hero banner fields + public storage bucket for images
-- ============================================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_title VARCHAR(255) DEFAULT '¡Sumérgete en el mundo de las mascotas!',
  ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT 'Encuentra los mejores productos y compañeros para tu hogar.',
  ADD COLUMN IF NOT EXISTS hero_cta_text VARCHAR(100) DEFAULT 'Explorar ahora',
  ADD COLUMN IF NOT EXISTS hero_cta_url VARCHAR(255) DEFAULT '/client';

-- Public bucket for site assets (hero banners, logos). Images are converted
-- to WebP client-side before upload, so this bucket only ever holds small,
-- web-optimized files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public-assets', 'public-assets', true, 5242880, ARRAY['image/webp', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (bucket is public), but only admins of the owning company
-- can upload/replace/delete files under their own folder.
CREATE POLICY "Public read access for public-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

CREATE POLICY "Admins can upload to public-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public-assets'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update their public-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'public-assets'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete their public-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'public-assets'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
