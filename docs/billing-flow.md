# Billing flow (Paddle)

Solo .Bizz uses Paddle Billing as merchant of record. Stripe has been removed.

## Environment

- `PADDLE_API_KEY` — server-side API key (sandbox by default).
- `PADDLE_CLIENT_TOKEN` — publishable client-side token used by Paddle.js.
- `PADDLE_WEBHOOK_SECRET` — signature secret for the notification destination.
- `PADDLE_ENVIRONMENT` — `sandbox` (default) or `production`.
- `PADDLE_SETUP_TOKEN` — one-off token authorising the `paddle-setup` function.

## Catalogue

`paddle-setup` (admin/service-role or `x-setup-token`) creates the Paddle
products and prices for every active plan in `plans` / `plan_prices` and stores
`plans.paddle_product_id` and `plan_prices.paddle_price_id`. It is idempotent:
rows that already carry a `paddle_price_id` are skipped. It also creates the
`SUPPORTUA50` 50% recurring discount used by the Support Ukraine campaign.

## Checkout

1. The app calls `create-checkout` with `{ planCode, billingPeriod, promoCode }`.
2. The function resolves `paddle_price_id`, finds/creates the Paddle customer,
   applies the Support Ukraine discount when the profile is eligible (validated
   server-side), and creates a Paddle transaction with
   `custom_data = { user_id, plan_code, billing_period }`.
3. It returns the hosted checkout URL (`/checkout?_ptxn=txn_…`).
4. `src/pages/CheckoutPage.tsx` loads Paddle.js with the client token from
   `paddle-config` and opens the overlay for that transaction.
5. Paddle redirects to `/purchase-success`, which forces a subscription refresh.

## Subscription state

- `check-subscription` reads the Paddle customer's active/trialing subscription,
  caches the result in `subscription_cache` (5 min TTL) and syncs
  `subscriptions` + `entitlements` (`source_type = 'paddle'`).
- `paddle-webhook` verifies the `Paddle-Signature` HMAC, handles
  `subscription.*` and `transaction.completed`, and invalidates the cache for
  the `custom_data.user_id`.
- `customer-portal` creates a Paddle customer portal session for billing
  management (payment method, cancellation, invoices).
