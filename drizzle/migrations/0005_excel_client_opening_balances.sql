CREATE TABLE public.client_import_batches (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, client_ids uuid[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.client_import_batches TO authenticated;
GRANT ALL ON public.client_import_batches TO service_role;
ALTER TABLE public.client_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_import_batches ON public.client_import_batches FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.client_opening_debts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE, original_amount numeric(12,2) NOT NULL CHECK(original_amount>0), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.client_opening_debts TO authenticated;
GRANT ALL ON public.client_opening_debts TO service_role;
ALTER TABLE public.client_opening_debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_opening_debts ON public.client_opening_debts FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.client_opening_debt_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, debt_id uuid NOT NULL REFERENCES public.client_opening_debts(id) ON DELETE CASCADE, income_id uuid NOT NULL UNIQUE REFERENCES public.income(id) ON DELETE CASCADE, amount numeric(12,2) NOT NULL CHECK(amount>0));
GRANT SELECT ON public.client_opening_debt_payments TO authenticated;
GRANT ALL ON public.client_opening_debt_payments TO service_role;
ALTER TABLE public.client_opening_debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_opening_debt_payments ON public.client_opening_debt_payments FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE VIEW public.client_opening_debt_balances WITH (security_invoker=true) AS SELECT d.*, greatest(0,d.original_amount-coalesce((SELECT sum(least(p.amount,i.amount)) FROM public.client_opening_debt_payments p JOIN public.income i ON i.id=p.income_id WHERE p.debt_id=d.id AND i.status='confirmed'),0)) AS amount FROM public.client_opening_debts d;
GRANT SELECT ON public.client_opening_debt_balances TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.import_excel_clients(p_rows jsonb,p_request_id uuid,p_language text) RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); r jsonb; ids uuid[]; c uuid; n int:=0; f text; v numeric; price numeric; pre numeric; debt numeric;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF p_request_id IS NULL OR p_language IS NULL OR p_language NOT IN ('uk','en','ru','pl','fr') THEN RAISE EXCEPTION 'Invalid import'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text,0));
 SELECT client_ids INTO ids FROM public.client_import_batches WHERE id=p_request_id AND user_id=u;
 IF FOUND THEN RETURN ids; END IF;
 IF p_rows IS NULL OR jsonb_typeof(p_rows)<>'array' THEN RAISE EXCEPTION 'Invalid import'; END IF;
 IF jsonb_array_length(p_rows)<1 OR jsonb_array_length(p_rows)>200 OR octet_length(p_rows::text)>500000 THEN RAISE EXCEPTION 'Invalid import'; END IF;
 ids:='{}';
 FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
 n:=n+1;
 IF jsonb_typeof(r)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(r) k WHERE k NOT IN ('name','phone','email','price','prepayment','debt')) THEN RAISE EXCEPTION 'Invalid import row %',n; END IF;
 IF jsonb_typeof(r->'name') IS DISTINCT FROM 'string' OR length(btrim(r->>'name')) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid name row %',n; END IF;
 IF jsonb_typeof(r->'phone') IS DISTINCT FROM 'string' OR length(r->>'phone')>40 OR (coalesce(r->>'phone','')<>'' AND ((r->>'phone') !~ '^[+0-9 ().-]+$' OR (r->>'phone') !~ '[0-9]')) THEN RAISE EXCEPTION 'Invalid phone row %',n; END IF;
 IF jsonb_typeof(r->'email') IS DISTINCT FROM 'string' OR length(r->>'email')>255 OR (coalesce(r->>'email','')<>'' AND (r->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN RAISE EXCEPTION 'Invalid email row %',n; END IF;
 FOREACH f IN ARRAY ARRAY['price','prepayment','debt'] LOOP
 IF f='price' AND r->f='null'::jsonb THEN CONTINUE; END IF;
 IF jsonb_typeof(r->f) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid amount row %',n; END IF;
 v:=(r->>f)::numeric;
 IF v<0 OR v>999999999.99 OR v<>round(v,2) THEN RAISE EXCEPTION 'Invalid amount row %',n; END IF;
 END LOOP;
 price:=(r->>'price')::numeric; pre:=(r->>'prepayment')::numeric; debt:=(r->>'debt')::numeric;
 INSERT INTO public.clients(user_id,name,phone,email,base_price,pricing_mode,communication_language) VALUES(u,btrim(r->>'name'),nullif(btrim(r->>'phone'),''),nullif(btrim(r->>'email'),''),price,'fixed',p_language) RETURNING id INTO c;
 ids:=array_append(ids,c);
 IF pre>debt THEN INSERT INTO public.client_credits(user_id,client_id,amount,description) VALUES(u,c,pre-debt,'Excel opening balance'); END IF;
 IF debt>pre THEN INSERT INTO public.client_opening_debts(user_id,client_id,original_amount) VALUES(u,c,debt-pre); END IF;
 END LOOP;
 INSERT INTO public.client_import_batches(id,user_id,client_ids) VALUES(p_request_id,u,ids);
 RETURN ids;
END $$;
REVOKE ALL ON FUNCTION public.import_excel_clients(jsonb,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_excel_clients(jsonb,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.pay_client_opening_debt(p_debt_id uuid,p_method text,p_date date) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); d public.client_opening_debts; outstanding numeric; inc uuid;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF p_date IS NULL OR NOT EXISTS(SELECT 1 FROM public.payment_methods WHERE user_id=u AND code=p_method AND is_active) THEN RAISE EXCEPTION 'Invalid payment method or date'; END IF;
 SELECT * INTO d FROM public.client_opening_debts WHERE id=p_debt_id AND user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Opening debt not found'; END IF;
 SELECT amount INTO outstanding FROM public.client_opening_debt_balances WHERE id=d.id;
 IF outstanding<=0 THEN RETURN NULL; END IF;
 INSERT INTO public.income(user_id,client_id,amount,date,source,status,payment_method,description) VALUES(u,d.client_id,outstanding,p_date,'manual','confirmed',p_method,'Opening debt payment') RETURNING id INTO inc;
 INSERT INTO public.client_opening_debt_payments(user_id,debt_id,income_id,amount) VALUES(u,d.id,inc,outstanding);
 RETURN inc;
END $$;
REVOKE ALL ON FUNCTION public.pay_client_opening_debt(uuid,text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pay_client_opening_debt(uuid,text,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.lock_client_insert_for_import() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text,0)); RETURN NEW; END $$;
CREATE TRIGGER aaa_lock_client_insert_for_import BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.lock_client_insert_for_import();