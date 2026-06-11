
-- Invoice signature feature: per-user scanned signature + optional stamp
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS use_scanned_invoice_signature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_signature_path text,
  ADD COLUMN IF NOT EXISTS invoice_stamp_path text;

-- Storage policies: each user can only access files inside a folder named after their own user id.
CREATE POLICY "Users read own invoice signatures"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoice-signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own invoice signatures"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoice-signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own invoice signatures"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'invoice-signatures' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'invoice-signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own invoice signatures"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invoice-signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
