INSERT INTO public.plan_prices (plan_id, billing_period, price, currency, is_active)
SELECT p.id, 'yearly', v.price, 'EUR', true
FROM public.plans p
JOIN (VALUES ('medium', 192.00), ('gold', 240.00), ('premium', 288.00)) AS v(code, price)
  ON v.code = p.code
WHERE NOT EXISTS (
  SELECT 1 FROM public.plan_prices pp
  WHERE pp.plan_id = p.id AND pp.billing_period = 'yearly'
);