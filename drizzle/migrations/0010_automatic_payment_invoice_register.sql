ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS income_id uuid REFERENCES public.income(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_income_id_unique ON public.invoices(income_id) WHERE income_id IS NOT NULL;
COMMENT ON COLUMN public.invoices.income_id IS 'One immutable invoice snapshot per confirmed incoming payment; legacy invoices remain unchanged.';
CREATE OR REPLACE FUNCTION public.create_confirmed_payment_invoice() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_client public.clients%ROWTYPE;
  v_appointment public.appointments%ROWTYPE;
  v_service text;
  v_date date;
  v_number text;
  v_rate numeric;
  v_net numeric;
  v_language text;
BEGIN
  IF NEW.status <> 'confirmed' OR NEW.amount <= 0 OR NEW.source = 'prepayment_withdrawal' OR NEW.payment_source = 'prepaid_balance' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE income_id = NEW.id) THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('invoice:' || NEW.user_id::text, 0));
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT * INTO v_client FROM public.clients WHERE id = NEW.client_id AND user_id = NEW.user_id;
  SELECT * INTO v_appointment FROM public.appointments WHERE id = NEW.appointment_id AND user_id = NEW.user_id;
  SELECT name INTO v_service FROM public.services WHERE id = v_appointment.service_id AND user_id = NEW.user_id;
  v_language := COALESCE(v_profile.language, 'uk');
  v_date := COALESCE(v_appointment.scheduled_at::date, NEW.session_date, NEW.date);
  v_number := public.generate_invoice_number(NEW.user_id, v_date);
  v_rate := CASE WHEN COALESCE(v_profile.vat_mode, 'none') = 'none' THEN 0 ELSE COALESCE(v_profile.vat_rate, 0) END;
  v_net := round(NEW.amount / (1 + v_rate / 100), 2);
  INSERT INTO public.invoices (user_id, income_id, appointment_id, client_id, invoice_number, invoice_date, session_date, service_name, client_name, client_email, client_phone, client_billing_address, client_billing_country, client_billing_tax_id, client_billing_company, provider_name, provider_business_name, provider_email, provider_phone, provider_business_id, provider_business_id_type, provider_business_country, provider_address, payment_status, payment_method, payment_date, net_amount, vat_rate, vat_amount, total_amount, vat_mode, currency, language)
  VALUES (NEW.user_id, NEW.id, v_appointment.id, v_client.id, v_number, CURRENT_DATE, v_date,
    COALESCE(v_service, NULLIF(NEW.description,''), CASE v_language WHEN 'en' THEN 'Payment' WHEN 'ru' THEN 'Оплата' WHEN 'pl' THEN 'Płatność' WHEN 'fr' THEN 'Paiement' ELSE 'Оплата' END),
    COALESCE(v_client.name, CASE v_language WHEN 'en' THEN 'Client' WHEN 'ru' THEN 'Клиент' WHEN 'pl' THEN 'Klient' WHEN 'fr' THEN 'Client' ELSE 'Клієнт' END),
    v_client.email, v_client.phone, v_client.billing_address, v_client.billing_country, v_client.billing_tax_id, v_client.billing_company_name,
    v_profile.full_name, v_profile.business_name, v_profile.public_email, v_profile.phone, v_profile.business_id, v_profile.tax_id_type, v_profile.business_country, v_profile.business_address,
    'paid_now', CASE WHEN NEW.payment_method IN ('cash','card','bank_transfer') THEN NEW.payment_method ELSE COALESCE(NEW.payment_method_name, NEW.payment_method) END, NEW.date,
    v_net, v_rate, NEW.amount - v_net, NEW.amount, COALESCE(v_profile.vat_mode, 'none'), COALESCE(NEW.currency, v_profile.currency, 'EUR'), v_language);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_confirmed_payment_invoice() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER create_confirmed_payment_invoice AFTER INSERT OR UPDATE OF status ON public.income FOR EACH ROW EXECUTE FUNCTION public.create_confirmed_payment_invoice();