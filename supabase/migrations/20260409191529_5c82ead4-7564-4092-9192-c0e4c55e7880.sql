-- Drop any existing owner-scoped policies
DROP POLICY IF EXISTS "Owner can view own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Owner can upload own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete own attachments" ON storage.objects;

-- Owner-scoped SELECT
CREATE POLICY "Owner can view own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-scoped INSERT
CREATE POLICY "Owner can upload own attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-scoped DELETE
CREATE POLICY "Owner can delete own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );