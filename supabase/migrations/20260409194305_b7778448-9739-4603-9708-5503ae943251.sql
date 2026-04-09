
-- Add notification preferences to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notification_preference text NOT NULL DEFAULT 'no_reminder',
  ADD COLUMN IF NOT EXISTS confirmation_required boolean NOT NULL DEFAULT false;

-- Add confirmation tracking to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS confirmation_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Update the status constraint to include 'reminder_sent'
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
  CHECK (status = ANY (ARRAY['scheduled','confirmed','completed','cancelled','no-show','reminder_sent']));

-- Add confirmation_status constraint
ALTER TABLE public.appointments ADD CONSTRAINT appointments_confirmation_status_check
  CHECK (confirmation_status = ANY (ARRAY['pending','confirmed','not_required']));

-- Add notification_preference constraint
ALTER TABLE public.clients ADD CONSTRAINT clients_notification_preference_check
  CHECK (notification_preference = ANY (ARRAY['email_only','telegram_only','email_and_telegram','no_reminder']));

-- Session confirmations table for public token-based confirmation
CREATE TABLE public.session_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_confirmations ENABLE ROW LEVEL SECURITY;

-- Public read by token (for confirmation links - no auth required)
CREATE POLICY "Anyone can read confirmation by token"
  ON public.session_confirmations
  FOR SELECT
  USING (true);

-- Authenticated users can create confirmations for their own appointments
CREATE POLICY "Users can create confirmations for own appointments"
  ON public.session_confirmations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = appointment_id
        AND appointments.user_id = auth.uid()
    )
  );

-- Public update for confirming (anyone with the token can confirm)
CREATE POLICY "Anyone can confirm via token"
  ON public.session_confirmations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
