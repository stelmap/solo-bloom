CREATE OR REPLACE FUNCTION public.client_prepaid_balance(p_client_id uuid,p_user_id uuid,p_exclude_appointment_id uuid DEFAULT NULL) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $function$
 WITH inc AS (
 SELECT i.id,greatest(0,i.amount-coalesce((SELECT sum(p.amount) FROM public.client_opening_debt_payments p WHERE p.income_id=i.id),0)) AS amount,i.appointment_id FROM public.income i WHERE i.client_id=p_client_id AND i.user_id=p_user_id AND i.status='confirmed' AND coalesce(i.source,'manual')<>'prepayment_withdrawal'
 ), alloc AS (
 SELECT isa.income_id,coalesce(sum(isa.allocated_amount) FILTER(WHERE a.id IS NULL OR a.status NOT IN ('scheduled','confirmed','reminder_sent')),0) AS hard_total,coalesce(sum(isa.allocated_amount),0) AS total FROM public.income_session_allocations isa LEFT JOIN public.appointments a ON a.id=isa.appointment_id WHERE isa.income_id IN(SELECT id FROM inc) AND (p_exclude_appointment_id IS NULL OR isa.appointment_id IS DISTINCT FROM p_exclude_appointment_id) GROUP BY isa.income_id
 ), base AS (
 SELECT greatest(0,inc.amount-coalesce(alloc.hard_total,0)-CASE WHEN coalesce(alloc.total,0)=0 AND inc.appointment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.appointments a2 WHERE a2.id=inc.appointment_id AND a2.status IN ('scheduled','confirmed','reminder_sent')) THEN inc.amount ELSE 0 END) AS available FROM inc LEFT JOIN alloc ON alloc.income_id=inc.id
 ), legacy AS (
 SELECT coalesce(sum(cc.amount),0) AS amt FROM public.client_credits cc WHERE cc.client_id=p_client_id AND cc.user_id=p_user_id AND cc.income_id IS NULL
 ) SELECT coalesce((SELECT sum(available) FROM base),0)+(SELECT amt FROM legacy);
$function$;
REVOKE ALL ON FUNCTION public.client_prepaid_balance(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.client_prepaid_balance(uuid,uuid,uuid) TO service_role;
COMMENT ON TABLE public.client_opening_debts IS 'Historical import balances, separate from appointment history; settled via income-linked allocations.';