-- Add telegram to clients
ALTER TABLE public.clients ADD COLUMN telegram text DEFAULT NULL;

-- Add payment_status to appointments
ALTER TABLE public.appointments ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid';

-- Create client_notes table
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own client_notes" ON public.client_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create client_attachments table
CREATE TABLE public.client_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'file',
  file_size integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own client_attachments" ON public.client_attachments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create expected_payments table
CREATE TABLE public.expected_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expected_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own expected_payments" ON public.expected_payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket for client attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('client-attachments', 'client-attachments', true);

-- Storage RLS policies
CREATE POLICY "Users can upload own attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view own attachments" ON storage.objects FOR SELECT USING (bucket_id = 'client-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own attachments" ON storage.objects FOR DELETE USING (bucket_id = 'client-attachments' AND auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_client_notes_updated_at BEFORE UPDATE ON public.client_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expected_payments_updated_at BEFORE UPDATE ON public.expected_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
