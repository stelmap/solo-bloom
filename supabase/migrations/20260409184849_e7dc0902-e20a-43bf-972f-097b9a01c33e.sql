
-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'client-attachments';

-- Drop any remaining overly-permissive policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload client attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view client attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete client attachments" ON storage.objects;
