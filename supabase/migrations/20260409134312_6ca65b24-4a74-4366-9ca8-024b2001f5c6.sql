
-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'client-attachments';

-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;

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
