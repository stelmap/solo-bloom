# Billing Flow

## Current Status: Not Implemented

Billing/subscription functionality has not been implemented yet. This document describes the **planned architecture**.

## Planned Flow

### Subscription Model
- **Trial:** 7-day free trial (no card required)
- **Paid:** €20/month recurring subscription
- **Payment provider:** Stripe (planned)

### Subscription States

```
[new user] → trial_active → active (paid)
                          → expired (trial ended, no payment)
              active      → payment_failed → active (retry success)
                          → cancelled (user cancelled)
              cancelled   → expired (end of billing period)
```

| State | Access |
|-------|--------|
| `trial_active` | Full access |
| `active` | Full access |
| `payment_failed` | Limited/warning |
| `cancelled` | Access until period end |
| `expired` | No access (redirect to billing) |

### Implementation Plan

1. **Stripe Integration**
   - Create Stripe customer on signup
   - Stripe Checkout for subscription
   - Stripe Customer Portal for management
   - Webhook endpoint for billing events

2. **Database**
   - `subscriptions` table with user_id, stripe_customer_id, status, current_period_end
   - RLS policies to check subscription status

3. **Edge Function**
   - `stripe-webhook` — process Stripe events
   - Events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`

4. **Frontend**
   - Billing page with current status
   - Upgrade/manage subscription buttons
   - Access gating based on subscription status

### Prerequisites
- Stripe account with API keys
- Stripe webhook secret configured
- Stripe product/price created for €20/month plan
