
DELETE FROM public.income_session_allocations
WHERE income_id NOT IN (SELECT id FROM public.income)
   OR appointment_id NOT IN (SELECT id FROM public.appointments);

ALTER TABLE public.income_session_allocations
  ADD CONSTRAINT income_session_allocations_income_id_fkey
  FOREIGN KEY (income_id) REFERENCES public.income(id) ON DELETE CASCADE;

ALTER TABLE public.income_session_allocations
  ADD CONSTRAINT income_session_allocations_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
