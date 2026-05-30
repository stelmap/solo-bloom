-- Clear orphaned references before adding FKs
UPDATE public.group_session_payments gsp
SET income_id = NULL
WHERE income_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.income i WHERE i.id = gsp.income_id);

UPDATE public.group_session_payments gsp
SET expected_payment_id = NULL
WHERE expected_payment_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.expected_payments e WHERE e.id = gsp.expected_payment_id);

DELETE FROM public.group_session_payments gsp
WHERE NOT EXISTS (SELECT 1 FROM public.group_sessions gs WHERE gs.id = gsp.group_session_id)
   OR NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = gsp.client_id)
   OR NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = gsp.group_id);

ALTER TABLE public.group_session_payments
  ADD CONSTRAINT group_session_payments_group_session_id_fkey
    FOREIGN KEY (group_session_id) REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  ADD CONSTRAINT group_session_payments_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD CONSTRAINT group_session_payments_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  ADD CONSTRAINT group_session_payments_expected_payment_id_fkey
    FOREIGN KEY (expected_payment_id) REFERENCES public.expected_payments(id) ON DELETE SET NULL,
  ADD CONSTRAINT group_session_payments_income_id_fkey
    FOREIGN KEY (income_id) REFERENCES public.income(id) ON DELETE SET NULL;