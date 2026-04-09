-- Performance indexes for scalability (2000+ concurrent users)

-- Appointments: most queried table, filtered by user + date range
CREATE INDEX IF NOT EXISTS idx_appointments_user_scheduled
  ON public.appointments (user_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_recurring_rule
  ON public.appointments (recurring_rule_id)
  WHERE recurring_rule_id IS NOT NULL;

-- Income: filtered by user + date for dashboard/reports
CREATE INDEX IF NOT EXISTS idx_income_user_date
  ON public.income (user_id, date);

CREATE INDEX IF NOT EXISTS idx_income_appointment
  ON public.income (appointment_id)
  WHERE appointment_id IS NOT NULL;

-- Expenses: filtered by user + date for dashboard/reports
CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON public.expenses (user_id, date);

-- Expected payments: filtered by user + status
CREATE INDEX IF NOT EXISTS idx_expected_payments_user_status
  ON public.expected_payments (user_id, status);

CREATE INDEX IF NOT EXISTS idx_expected_payments_appointment
  ON public.expected_payments (appointment_id);

-- Client notes: looked up by client_id
CREATE INDEX IF NOT EXISTS idx_client_notes_client
  ON public.client_notes (client_id);

-- Client attachments: looked up by client_id
CREATE INDEX IF NOT EXISTS idx_client_attachments_client
  ON public.client_attachments (client_id);