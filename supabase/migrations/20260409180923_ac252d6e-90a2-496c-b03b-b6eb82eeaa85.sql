-- Add UPDATE policy for client-attachments bucket scoped to owner
CREATE POLICY "Owner can update own attachments"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'client-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'client-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );