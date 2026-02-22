
-- Create storage bucket for message media (voice, images)
INSERT INTO storage.buckets (id, name, public) VALUES ('message-media', 'message-media', true);

-- Allow authenticated users to upload their own media
CREATE POLICY "Users can upload message media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'message-media' AND auth.uid() IS NOT NULL);

-- Allow anyone to view message media
CREATE POLICY "Message media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
USING (bucket_id = 'message-media' AND auth.uid()::text = (storage.foldername(name))[1]);
