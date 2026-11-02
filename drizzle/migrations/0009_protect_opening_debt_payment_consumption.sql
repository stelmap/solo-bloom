DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='consume_client_credit_for_appointment';
 IF position('SELECT i.id, i.amount, i.appointment_id, i.created_at' in definition)=0 THEN RAISE EXCEPTION 'Unexpected prepaid function definition'; END IF;
 definition:=replace(definition,'SELECT i.id, i.amount, i.appointment_id, i.created_at','SELECT i.id, greatest(0,i.amount-coalesce((SELECT sum(p.amount) FROM public.client_opening_debt_payments p WHERE p.income_id=i.id),0)) AS amount, i.appointment_id, i.created_at');
 EXECUTE definition;
END $migration$;