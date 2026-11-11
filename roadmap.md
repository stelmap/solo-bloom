# Roadmap

## Real public product experience
Implementation delegated to the separate “Real interactive product experience” draft; main-app changes await draft completion and review.
- [ ] Reuse actual Calendar, Clients/Profile, Payments, Dashboard and Public Booking screens with isolated server-backed visitor workspaces.
- [ ] Remove hero screenshot, preserve headline/benefits and connect five module entry points to the full workspace.
- [ ] Preserve production behavior, block external notifications/payments, implement session expiry and visitor-only reset.
- [ ] Verify the complete client → meeting → payment → dashboard → booking → reset flow and cross-visitor/production isolation before marking complete.

## Landing hero refinement
- [x] Replace the main headline and subtitle in all five languages; restore the centered dark-blue presentation.
- [x] Preserve the current single calendar screenshot and add three concise benefits with orange icons and responsive separators.
- [x] Verify the Ukrainian hero and screenshot enlargement at 1280×1800, 1014×634 and 390×844; no horizontal overflow or runtime errors, 7 demo regression tests passed.

## Public interactive demo
- [x] Replace only the main landing image with the supplied calendar screenshot, preserving layout and enlargement.
- [x] Add visitor-local Calendar, Clients, Payments and Dashboard demo modules using shared production UI, linked synthetic records and reset/expiry.
- [x] Replace static feature previews with module entry points; preserve registration, billing and production data.
- [x] Verify client → meeting → payment → dashboard, pending-status recalculation, reload, reset, visitor isolation and desktop/mobile overflow; 17 tests passed. No client/meeting/payment writes or integrations. Demo uses shared presentation components rather than mounting full authenticated pages; standard trial activation remains part of the earlier unverified subscription work.

## Subscription rules and landing redesign
- [x] Agree the safe rollout of Solo/Pro entitlements and a 14-day full-feature trial before changing subscriptions.
- [x] Add versioned access, confirmation-triggered trial, restricted write triggers and new-account plan presentation; 31 regression tests passed.
- [x] Add localized landing, product previews, image enlargement, two pricing cards, comparison, FAQ, updates and analytics.
- [x] Verify desktop/mobile landing tabs, enlargement, comparison, FAQ and registration navigation without runtime errors or horizontal overflow.
- [ ] Complete authenticated new-account signup/confirmation, expiry/write-denial and paid-plan checks; these flows have not been exercised end-to-end.
- [ ] Finish screenshot refresh/localized samples and verification of social accounts; Instagram URL has not been supplied or verified.
- [ ] Review all privileged payment/booking paths and server-side plan enforcement before publishing the changed offer.

## Referral end-to-end test
- [x] Sign up through the owner's referral link and confirm the test email.
- [x] Verify automatic attribution and registered/€0 row in the owner's referral page; approve a temporary €10 payout to Processing and read back in both admin and owner history. Remove test account, referral, payout and test approval audit. No paid subscription or money transfer tested.

## Admin referral payouts
- [x] Add admin-only recipient bank details for each payout; 10 tests passed and authenticated saving/read-back verified on desktop and phone. Temporary payout removed; no transfers.
- [x] Add admin-only payout review, approval, rejection and external-transfer confirmation.
- [x] Verify approval → Paid, rejection, required transfer confirmation, terminal-state protection, anonymous denial and referral history read-back with temporary records; clean all test payouts. No money transferred.

## Invoice register
- [x] Add Finances → Registers → Invoices, preserving existing records and numbering.
- [x] Automatically create invoices for successfully saved payments with or without a meeting; remove meeting-level creation.
- [x] Verify 16 unit tests plus authenticated invoice integration tests; verify manual payment → register → PDF in the browser and clean temporary records. Physical printing and meeting-completion UI are not end-to-end verified.

## Excel client import
- [x] Add editable multi-row Excel paste with validation and localized feedback.
- [x] Save clients and opening balances atomically while preserving plan limits and export.
- [x] Run 10 regression tests; verify authenticated import, validation, opening balances and test debt payment; remove test records.

## Meeting duration correction
- [x] Synchronize new meeting times and preserve custom duration in all save paths.
- [x] Allow clearable service duration and price fields; group meetings use the shared duration control.
- [x] Run duration regression tests and verify authenticated form entry and service initialization; saving/reopening real meetings remains unverified.

## Calendar synchronization and interface language
- [x] Diagnose and correct shared calendar/dashboard data, dates and updates.
- [x] Preserve language choices and offer all languages before registration and in setup.
- [x] Run regression tests and verify available browser flows.

## Support Ukrainian Psychotherapists campaign (50% off Solo & Pro)
- [x] Campaign source of truth (`src/lib/supportUkraine.ts`) + eligibility hook
- [x] Analytics events
- [x] Banner, price display, promo input components
- [x] Landing page banner + discounted pricing
- [x] Plans page pricing, promo panel, checkout hint, tracking
- [x] Server-side eligibility + coupon applied once in `create-checkout` (no stacking)
- [x] Billing settings campaign block (status, plan, discounted renewal, notice)
- [x] Conversion tracking on purchase success
- [x] Stripe coupon + promotion code (live), `promotions` row registered

## Other
- [x] BETA label next to SoloBizz in the sidebar

- [x] Session payment: allocate payment to the closed session first, then older debts
- [x] Group session closing flow/UI matches single-session one-click bar

## Hero slider (landing)
- [x] Arrows overlaid on left/right edges of the screenshot (no arrow row below)
- [x] Remove small preview thumbnails from the overview slide
- [x] Tabs, arrows, dots and counter drive one shared slide state
- [x] Fluid hero layout (no fixed px), aspect-ratio screenshot, no horizontal scroll

## Paddle billing migration (replaces Stripe)
- [x] Store Paddle credentials (sandbox API key, client token, webhook secret)
- [x] Recreate plans/prices in Paddle and map to `plan_prices.paddle_price_id`
- [x] Replace `create-checkout` / `check-subscription` / `customer-portal`; `stripe-webhook` → `paddle-webhook`
- [x] Support Ukraine 50% discount ported (`SUPPORTUA50`); no trial (already removed)
- [x] `/checkout` overlay page, billing settings + e2e test on Paddle
- [ ] Switch `PADDLE_ENVIRONMENT` to `production` and rerun `paddle-setup` after Paddle verification

## Billing periods (Month / Quarter −10% / Year −20%)
- [x] New quarterly/yearly prices in database and Paddle; old prices kept for existing subscribers only.
- [x] Home page switch with total, crossed-out price, savings and monthly equivalent; plans page defaults to Month and keeps the period chosen before sign-up.
- [x] Subscription screen shows renewal amount.
- [ ] In-app plan/period change applied at next renewal (approved policy) — needs a scheduled renewal-time switch; not built yet.
