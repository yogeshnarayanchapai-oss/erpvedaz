-- Create branding storage bucket for logos and banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload branding files
CREATE POLICY "Admins can upload branding files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding' AND
  has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Allow authenticated admins to update branding files
CREATE POLICY "Admins can update branding files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding' AND
  has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Allow authenticated admins to delete branding files
CREATE POLICY "Admins can delete branding files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding' AND
  has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Allow public read access to branding files (for logos/banners)
CREATE POLICY "Public can view branding files"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Also create system_branding table if needed with default data
INSERT INTO system_branding (brand_name)
VALUES ('Zivkart OS')
ON CONFLICT DO NOTHING;