-- Replace legacy plans (medium/gold/premium) with Solo + Pro tiers
-- Deactivate old plans and prices first to preserve history
UPDATE public.plan_prices SET is_active = false WHERE plan_id IN (
  SELECT id FROM public.plans WHERE code IN ('medium', 'gold', 'premium')
);
UPDATE public.plans SET is_active = false WHERE code IN ('medium', 'gold', 'premium');

-- Insert new Solo and Pro plans (idempotent)
INSERT INTO public.plans (code, name, description, is_active)
VALUES
  ('solo', 'Solo', 'For solo practitioners getting started with calendar, clients and reminders.', true),
  ('pro', 'Pro', 'Everything in Solo plus finance, invoices, supervision and analytics.', true)
ON CONFLICT DO NOTHING;

-- Insert prices for Solo
INSERT INTO public.plan_prices (plan_id, billing_period, price, currency, stripe_price_id, is_active)
SELECT p.id, 'monthly', 19, 'EUR', 'price_1TPQ3DRxXuU3N5IFMcxZCvva', true FROM public.plans p WHERE p.code = 'solo'
UNION ALL
SELECT p.id, 'quarterly', 45, 'EUR', 'price_1TPQ5FRxXuU3N5IF5ufGLkV1', true FROM public.plans p WHERE p.code = 'solo'
UNION ALL
SELECT p.id, 'yearly', 132, 'EUR', 'price_1TPQ60RxXuU3N5IFBiGOuz8f', true FROM public.plans p WHERE p.code = 'solo'
UNION ALL
SELECT p.id, 'monthly', 49, 'EUR', 'price_1TPQahRxXuU3N5IF3umwA0Bd', true FROM public.plans p WHERE p.code = 'pro'
UNION ALL
SELECT p.id, 'quarterly', 117, 'EUR', 'price_1TPQbIRxXuU3N5IFPVrvG60z', true FROM public.plans p WHERE p.code = 'pro'
UNION ALL
SELECT p.id, 'yearly', 348, 'EUR', 'price_1TPQbmRxXuU3N5IFirrjnqdi', true FROM public.plans p WHERE p.code = 'pro';