-- Prevent duplicate active allocations for the same (income_id, appointment_id) pair
CREATE UNIQUE INDEX IF NOT EXISTS income_session_allocations_income_apt_uniq
  ON public.income_session_allocations (income_id, appointment_id);