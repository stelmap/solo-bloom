# Solo.Bizz Analytics Dashboard — Implementation Plan

Scope from your spec, with these decisions locked in: in-app custom dashboard, all funnel events instrumented first, access restricted to `o.gilevich@gmail.com`.

## 1. Event instrumentation (foundation)

Extend `src/lib/analytics.ts` `AnalyticsEvent` union and fire events at the right places. Each event is captured both in PostHog (for heatmap/segmentation) and persisted to `user_activity_events` in Supabase (so the dashboard queries are fast and email-joinable).

Events to add / wire up:

- `website_page_view` — already covered by PostHog `$pageview` + SPA wrapper.
- `auth_page_opened` — fire on `/auth` mount (`AuthPage.tsx`).
- `registration_started`, `registration_completed`, `registration_failed` — `AuthPage.tsx` signup branch + `AuthContext`.
- `login_completed` — already exists.
- `product_entered` — fire once per session on first authenticated route inside `AppLayout.tsx`.
- `dashboard_opened`, `calendar_opened`, `clients_opened`, `finances_opened`, `income_page_opened`, `settings_opened` — page mounts.
- `first_appointment_created`, `first_client_created` — wrap existing `client_created` / `session_created` with a one-time check against PostHog person property `has_created_first_client` / `..._appointment` via `persons-property-set`.
- `pricing_page_viewed` — fire on `/plans` mount + landing pricing block intersection observer.
- `tariff_selected` — already partly covered by `cta_clicked`; add explicit event with `plan_id`.
- `stripe_checkout_opened` — already covered by `checkout_started` / `stripe_checkout_started`.
- `subscription_completed` — already covered by `subscription_active` from `PurchaseSuccessPage`.
- `payment_succeeded`, `payment_failed`, `subscription_cancelled` — Stripe webhook → log to `user_activity_events`.
- `scroll_depth` — landing-only, 25/50/75/100% buckets via IntersectionObserver.

UTM + referrer capture: in `initAnalytics()`, parse `window.location.search` for `utm_*` + `referrer` + `landing_domain` and `posthog.register()` as super-properties so every event carries them.

Anonymous → user alias: on successful login/signup, call `posthog.alias(anonId, userId)` then `identifyUser()`. Already partially done in `identifyUser`; add `alias` step in `AuthContext` post-auth effect.

## 2. Server-side event log

New table `analytics_events` (Supabase) — we already have `user_activity_events` but it's user-scoped. Extend its usage: keep current table, add columns `domain text`, `path text`, `country text`, `device text`, `source text`, `utm_source text`, `utm_medium text`, `utm_campaign text`, `anonymous_id text`, `metadata jsonb`. RLS: admin-only read (via `has_role` or hardcoded email check in edge function). Insert from authenticated client for logged-in events; anonymous events stay PostHog-only (we'll query PostHog for landing/anon funnel steps).

Funnel data strategy: a single edge function `admin-analytics` is the source of truth. It:
1. Queries PostHog HogQL API for anonymous-stage counts (website_page_view, auth_page_opened, registration_completed) with filters.
2. Queries Supabase for authenticated-stage counts (product_entered, first action, pricing, subscription) joined to `auth.users` for email.
3. Returns one JSON blob the frontend renders.

## 3. Admin route + UI

- `src/pages/AdminAnalyticsPage.tsx` — main dashboard at `/admin/analytics`.
- Guard: reuse `ProtectedRoute` + extra check `user.email === 'o.gilevich@gmail.com'`, redirect otherwise.
- Add nav link in `AppSidebar` (admin-only).
- Components (all new under `src/components/admin/analytics/`):
  - `FiltersBar` — domain, country, device, source, date range (today / 7d / 30d / month / custom).
  - `WebMetricsRow` — visitors, page views, avg duration, bounce, current visitors (PostHog embed widgets or numeric tiles from HogQL).
  - `FunnelCard` — 7-step funnel with count + step% + total% + drop-off.
  - `BreakdownTabs` — source / page / device / country tables.
  - `ActiveUsersTable` — email, user_id, registered, last activity, sessions, clients, appointments, plan, status, country, device, first source, last source. Row click → `UserJourneyDrawer`.
  - `UserJourneyDrawer` — chronological event list for a single user (Supabase + PostHog person events).
  - `HeatmapPanel` — embedded PostHog heatmap iframe for the landing URL with the same domain/country/device/source filters passed as query params (PostHog supports this).

## 4. Edge functions

- `admin-analytics` (new): accepts `{filters, view}`, validates caller email == admin, runs HogQL via PostHog Query API using `POSTHOG_PERSONAL_API_KEY`, joins with Supabase, returns dashboard payload.
- `admin-user-journey` (new): `{user_id}` → returns merged event timeline.
- Extend `stripe-webhook` to write `payment_succeeded` / `payment_failed` / `subscription_cancelled` rows into `user_activity_events`.

Required secret: `POSTHOG_PERSONAL_API_KEY` (I will request via `add_secret` when we get there — get it from PostHog → Settings → Personal API keys, scopes: `query:read`, `person:read`, `insight:read`).

## 5. Heatmap

PostHog already records sessions and supports heatmaps natively. `HeatmapPanel` embeds the PostHog heatmap toolbar URL for the configured landing domain. No new instrumentation needed beyond `scroll_depth` and existing autocapture clicks.

## 6. Access control

- Frontend: route guard checks `user.email === 'o.gilevich@gmail.com'`.
- Backend: every analytics edge function re-validates `auth.uid()` → `auth.users.email === 'o.gilevich@gmail.com'`. No reliance on roles for this surface.

## 7. Out of scope (per your spec section 17)

Multi-touch attribution, CAC/LTV/ROAS, session replay UI inside the app, ad-platform integrations, AI recommendations.

---

## Suggested build order

1. Migration: extend `user_activity_events` columns + admin-only RLS additions.
2. Instrument all missing events + UTM capture + anon→user alias.
3. Request `POSTHOG_PERSONAL_API_KEY` secret.
4. Build `admin-analytics` + `admin-user-journey` edge functions.
5. Build `/admin/analytics` page + components.
6. Wire Stripe webhook additions.
7. Test end-to-end with your account; verify funnel populates and your email appears in active users.

This will take several iterations. Confirm and I'll start with steps 1–2 in the next turn.