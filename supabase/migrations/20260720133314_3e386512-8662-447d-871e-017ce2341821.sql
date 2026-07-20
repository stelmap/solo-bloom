
DROP POLICY IF EXISTS "therapist_reads_own_agreement_docs" ON storage.objects;
CREATE POLICY "therapist_reads_own_agreement_docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agreement-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
