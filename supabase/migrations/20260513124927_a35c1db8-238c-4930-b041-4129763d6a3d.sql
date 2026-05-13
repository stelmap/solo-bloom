
UPDATE public.plans
   SET name = 'Solo Practice',
       description = 'For regular private practice — up to 20 active clients.'
 WHERE code = 'solo';

UPDATE public.plans
   SET name = 'Pro Practice',
       description = 'For practices that scale — unlimited active clients.'
 WHERE code = 'pro';

-- Solo Practice: keep monthly €19, update quarterly to €45.60 and yearly to €136.80
UPDATE public.plan_prices
   SET price = 45.60,
       stripe_price_id = 'price_1TWcCHRxXuU3N5IFC5Utn8J2'
 WHERE plan_id = (SELECT id FROM public.plans WHERE code = 'solo')
   AND billing_period = 'quarterly';

UPDATE public.plan_prices
   SET price = 136.80,
       stripe_price_id = 'price_1TWcCdRxXuU3N5IFuIebenPC'
 WHERE plan_id = (SELECT id FROM public.plans WHERE code = 'solo')
   AND billing_period = 'yearly';

-- Pro Practice: keep monthly €49, update quarterly to €117.60 and yearly to €352.80
UPDATE public.plan_prices
   SET price = 117.60,
       stripe_price_id = 'price_1TWcCuRxXuU3N5IFR81am4Vk'
 WHERE plan_id = (SELECT id FROM public.plans WHERE code = 'pro')
   AND billing_period = 'quarterly';

UPDATE public.plan_prices
   SET price = 352.80,
       stripe_price_id = 'price_1TWcD9RxXuU3N5IFWoCbTUvm'
 WHERE plan_id = (SELECT id FROM public.plans WHERE code = 'pro')
   AND billing_period = 'yearly';
