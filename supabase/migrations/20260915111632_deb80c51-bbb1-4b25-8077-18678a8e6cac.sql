ALTER TABLE public.plan_prices ADD COLUMN IF NOT EXISTS paddle_price_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS paddle_product_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;
CREATE INDEX IF NOT EXISTS plan_prices_paddle_price_id_idx ON public.plan_prices (paddle_price_id);
CREATE INDEX IF NOT EXISTS subscriptions_paddle_subscription_id_idx ON public.subscriptions (paddle_subscription_id);