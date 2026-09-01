CREATE OR REPLACE FUNCTION public.recalc_my_appointment_payment_status(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = p_appointment_id AND a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized for this appointment';
  END IF;

  PERFORM public.recalc_appointment_payment_status(p_appointment_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalc_my_appointment_payment_status(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalc_my_appointment_payment_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_my_appointment_payment_status(uuid) TO service_role;

-- Backfill: refresh any completed session that has confirmed income but is still marked as awaiting payment
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT a.id
    FROM public.appointments a
    JOIN public.income i ON i.appointment_id = a.id AND i.status = 'confirmed'
    WHERE a.payment_status IN ('waiting_for_payment','unpaid','partially_paid','partially_paid_from_prepayment')
  LOOP
    PERFORM public.recalc_appointment_payment_status(r.id);
  END LOOP;
END $$;