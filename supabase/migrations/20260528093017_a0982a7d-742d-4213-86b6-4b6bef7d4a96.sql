UPDATE public.plan_prices SET price = 12 WHERE plan_id = (SELECT id FROM public.plans WHERE code='solo') AND billing_period='monthly';
UPDATE public.plan_prices SET price = 28.80 WHERE plan_id = (SELECT id FROM public.plans WHERE code='solo') AND billing_period='quarterly';
UPDATE public.plan_prices SET price = 86.40 WHERE plan_id = (SELECT id FROM public.plans WHERE code='solo') AND billing_period='yearly';
UPDATE public.plan_prices SET price = 24 WHERE plan_id = (SELECT id FROM public.plans WHERE code='pro') AND billing_period='monthly';
UPDATE public.plan_prices SET price = 57.60 WHERE plan_id = (SELECT id FROM public.plans WHERE code='pro') AND billing_period='quarterly';
UPDATE public.plan_prices SET price = 172.80 WHERE plan_id = (SELECT id FROM public.plans WHERE code='pro') AND billing_period='yearly';