# Roadmap

## Landing calendar client names — 21 November 2026
- [x] Localize remaining English/Ukrainian client names in screenshot assets; retain the existing German, Polish, French and Russian localized names and all real client data.
- [x] All six landing images loaded on desktop/mobile (12 checks), enlargement worked, and no horizontal overflow or runtime errors occurred; changes remain in preview.

## Public booking link localization — 21 November 2026
- [x] Preserve the active language in Copy/Preview links across Calendar, Dashboard, Profile and booking settings; keep all six public-page languages and existing booking behavior.
- [x] Seven link tests passed; selected a real available slot and opened the localized client form in all six languages without submitting requests; build OK, changes remain in preview.

## Genuine testimonial translations — 21 November 2026
- [x] Translate the existing approved user review into six languages without adding invented reviews or changing the stored original.
- [x] Verify all six languages display the real review and submitted name; two source-protection tests passed, build OK; changes remain in preview.

## Calendar screenshot names and titles — 21 November 2026
- [x] Localize names and meeting/group titles in German, Polish, French and Russian screenshot assets only; preserve Ukrainian/English and the real calendar.
- [x] Verify readable text, desktop/mobile display and enlargement in all four languages (eight browser checks); current build OK, changes remain in preview.

## Booking inbox localization correction — 21 November 2026
- [x] Verify published inbox page/panel in all six languages without changing requests.
- [x] Localize the panel, page, dialogs and notifications through shared app dictionaries; preserve all booking actions.
- [x] Verify signed-in preview with real requests and confirmation dialogs in all six languages; 18 tests passed, details in docs/booking-inbox-localization-2026-11-21.md.
- [ ] Publish corrected translations and recheck solo-bizz.com — awaiting owner publication permission.

## Published application localization QA — 21 November 2026
- [x] Check published deployment, signed-in booking inbox/panel, calendar, practice/About me editor, public review form and booking-link settings in all six languages; mobile booking/About me checked at 390×844. No production records changed; details in docs/published-localization-qa-2026-11-21.md.

## Multilingual landing SEO — 21 November 2026
- [x] Reuse the existing landing for /uk/, /en/, /pl/, /de/, /fr/, /ru/, keeping legal and application URLs unchanged.
- [x] Generate seven crawler-readable HTML files with reciprocal metadata and six new navy 1200×630 branded previews from shared components; production-emission test passed.
- [x] Preserve legacy query links through client navigation and retain campaign parameters/section anchors; OAuth callbacks are not rewritten.
- [ ] HTTP 301/308 legacy query redirects need request-level hosting support; current static hosting cannot route by query, so legacy social crawlers still see the English fallback before JavaScript.
- [x] Validate six-language raw HTML and browser layout, 390/768 widths, URL switching, image dimensions/access and sitemap; 24 tests passed. All nine acceptance statuses documented.
- [x] Confirm deployment and verify all six production language pages — all six localized landing pages opened successfully on solo-bizz.com during subsequent signed-in localization QA. Basic security checks passed; social-platform validators remain a separate follow-up.

## Unpaid Payments mismatch
- [x] Use the same participant-level debt rows for the Unpaid list, count, filters and expected total; signed-in view now shows 1 participant owing €100 rather than 60 group parents; 7 tests passed, no real payment recorded.

## Pre-marketing corrections — 20 November 2026
- [x] Replace patched calendar screenshot text with aligned high-resolution lettering across six languages; retain existing grid and meeting positions without changing the working calendar.
- [x] Replace fictional-franchise names in six existing calendar screenshots, set their unpaid counter to 3, translate controls/meeting labels and Ukrainian month abbreviation; interactive demo now starts with exactly 3 outstanding meetings (tested), without production-calendar changes.
- [x] Translate registration home link, warm up introductory copy in six languages, correct Solo feature wording and use a brand mission in the footer.
- [x] Remove only q45265656 and replace PSU with the requested professional title in the owner's draft/published profile through the authenticated owner API; public read-back verified.
- [x] Add owner-confirmed Instagram https://www.instagram.com/olga_solobizz/ and verify its footer link.
- [x] Add owner-confirmed Threads https://www.threads.com/@olga_solobizz alongside Instagram.
- [ ] Add genuine approved testimonials, photos and featured public profiles — awaiting owner content/consent; do not invent endorsements.
- [x] Replace fictitious landing specialist with the existing published Olga profile and actual permitted photo; center the lone approved review instead of fabricating additional endorsements.
- [x] Confirm EU database region from hosted project information and add narrow client-record storage statement linked to Privacy; no blanket GDPR compliance guarantee.
- [ ] Honest public usage statistic awaits a reliable active/non-test definition and owner approval; raw account/appointment totals are not a trustworthy marketing number.
- [x] Audit existing six language-specific query URLs, reciprocal hreflang and page metadata; preserve these indexed links and existing sitemap mechanism (lastmod is profile published_at, not build time).
- [ ] Same-domain personalized therapist/booking crawler previews remain a separate server-rendering stage; landing-only static rendering and /uk-style paths are now requested for 21 November.
- [x] Prepare six 1200×630 brand preview assets, connect them to rendered metadata, and add consent-respecting registration UTM retention with 5 tests; campaign URLs documented in docs/pre-marketing-2026-11-20.md. Actual registration was not submitted.
- [x] Verify six-language metadata/images/profile preview, signup return link, localized demo modes/dialog and desktop/mobile layout; 17 unit tests passed and current build OK. Vite lacks asset proxy, so browser validation resolved immutable assets through published asset handler. Frontend not published; owner profile correction already live.

## Consolidated QA — 17 November 2026
- [x] Localized 404 recovery, booking labels/errors and German cookie notice; existing synthetic calendar language interactions checked. Exact authenticated-calendar reuse remains blocked on separate draft; static booking screenshot is not localized.
- [x] Reconciled operator identity across five legal translations and preserved refund terms; missing jurisdiction details remain operator/legal input below.
- [x] Deduplicated rendered metadata, aligned marketing/legal canonical/hreflang and current social previews; external social-crawler/cache checks await publication authorization.
- [x] Shared crawler rules and 42 canonical sitemap URLs verified in preview; production verification awaits approved publication. HTTP 404 status is unavailable in this client-side SPA hosting architecture.
- [x] Executed available REG-01–15 checks and 32 tests; scope/evidence/partial results in docs/qa-fixes-2026-11-17.md. No deployment or customer/billing/security changes; cross-tenant authentication checks not exercised.

## Legal content consistency
- [x] Correct Terms in EN/UK/PL/FR/RU: unlimited clients for both plans, remove unfinished governing-law clauses and use the owner-confirmed name; all five preview pages verified, 10 plan-feature tests passed, no billing changes. Required analytics disclosures included; not published.
- [ ] Operator/legal owner must supply approved explicit governing-law and competent-court wording, full registered address and any required registration identifier. The name alone does not confirm these details; do not invent them or publish placeholders.
- [x] Privacy controller identity reconciled with owner-confirmed Terms name in five languages; no new registration or jurisdiction details invented.

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
