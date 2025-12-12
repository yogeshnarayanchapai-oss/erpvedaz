-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Users can upload files to their store folder
CREATE POLICY "Users can upload chat files to their store"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT usa.store_id::text 
    FROM user_store_access usa 
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  )
);

-- RLS policy: Users can view files from their store
CREATE POLICY "Users can view chat files from their store"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] IN (
    SELECT usa.store_id::text 
    FROM user_store_access usa 
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  )
);

-- RLS policy: Users can delete their own files
CREATE POLICY "Users can delete their own chat files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-files'
  AND auth.uid()::text = (storage.foldername(name))[2]
);