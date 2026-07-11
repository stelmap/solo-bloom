ALTER TABLE public.expected_payments
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid;

CREATE INDEX IF NOT EXISTS idx_expected_payments_status_appt
  ON public.expected_payments (appointment_id, status);