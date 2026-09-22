# Solo .Bizz — Baseline Specification

**Status:** Baseline (as-built), reverse-engineered from the production codebase
**Version:** 1.0 — 22 Sep 2026
**Scope:** Everything currently shipped. Future work is out of scope and lives in `roadmap.md`.

This document is written in specification-driven-development style: every capability is
stated as intent → requirements → acceptance criteria, so future changes can be proposed
as diffs against this baseline instead of against the code.

---

## 1. Product intent

Solo .Bizz is a single calm workspace for solo practitioners (psychologists, therapists,
coaches, tutors, beauty and consulting professionals) to run a private practice: clients,
sessions, group work, agreements, payments, finances and reporting.

**Primary user:** one professional running their own practice, no staff, no accountant.
**Secondary actors:** the professional's clients (public booking, agreement signing,
session confirmation — no account required), and Solo .Bizz administrators.

**Non-goals (deliberate):** multi-seat teams, clinic/organisation hierarchies, insurance
claims, in-app messaging with clients, native mobile apps.

---

## 2. System baseline

| Layer | As built |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind 3, shadcn/ui, Framer Motion |
| Data layer | TanStack React Query; hooks in `src/hooks/` |
| Routing | React Router 6, lazy routes with stale-chunk auto-reload |
| Backend | Managed cloud backend (PostgreSQL + Auth + Storage + Edge Functions) |
| Tables | 74 in `public`, all RLS-protected and user-scoped |
| Edge functions | 35 (billing, email, agreements, GDPR, admin, support, Telegram, MCP) |
| Migrations | 177 applied |
| Billing | Paddle (Merchant of Record), live |
| Analytics | PostHog (EU), Plerdy, Meta Pixel — consent-gated |
| Languages | EN, UK, PL, FR, RU |
| Tests | Vitest (unit), Playwright (e2e + perf) |

---

## 3. Capabilities

### 3.1 Identity and access
- **Requirements:** email/password and Google sign-in; email verification; password
  recovery at `/reset-password`; session persists across reloads; every protected route
  is guarded; roles live in `user_roles` and are checked through `has_role()`.
- **Acceptance:** a signed-out visitor reaching a protected route lands on `/auth`;
  a non-admin reaching `/admin/*` is refused; no role is ever read from the browser.

### 3.2 Onboarding
- **Requirements:** 7-step guided journey with deep links into the real screens; never
  fabricates business data; dismissal/minimisation persists per user and session.
- **Acceptance:** completing a step marks it done from real data, not from a local flag.

### 3.3 Clients
- **Requirements:** CRUD, archive, search/filter, per-client notes (encrypted at rest),
  attachments, language, price history, credit balance, status and language audit trails.
- **Acceptance:** a client's data is readable only by its owner; deleting an account
  removes or anonymises client records per the GDPR flow.

### 3.4 Services, groups and supervision
- **Requirements:** service catalogue (name, price, duration, format); groups with
  members, group sessions, attendance and per-member payments; supervision records
  creatable from session notes.
- **Acceptance:** a group session settles payments per attending member, not per group.

### 3.5 Calendar and sessions
- **Requirements:** month/week/day calendar; create, edit, reschedule, cancel, no-show,
  complete; recurring rules generating independent occurrences; working schedule; days
  off; multiple blocked time ranges per day; flexible pricing at completion.
- **Acceptance:** one full day-off per day, unlimited partial blocks per day;
  cancelling a billed session produces the documented financial outcome.

### 3.6 Public booking
- **Requirements:** public link `/book/:token`; slots generated server-side from working
  schedule and availability, minus days off, blocked time, existing sessions and pending
  requests; requests land in an inbox; known emails link to the existing client, unknown
  ones open a pre-filled create-client step that chains into confirmation.
- **Acceptance:** slots always render in ascending chronological order; the chosen time
  is stored and displayed identically in the request, calendar and emails (UTC wall-clock
  convention); a booked slot disappears immediately; no duplicate client is created.

### 3.7 Agreements
- **Requirements:** templates with versions; invitations by email; OTP verification;
  client-side acceptance at `/agreement/:token`; signed PDF; full audit trail.
- **Acceptance:** an agreement can only be opened with a valid token and verified session.

### 3.8 Finances
- **Requirements:** income with per-session allocations, expected payments, client
  credits, expenses (incl. recurring), tax settings and accrual, invoices, break-even
  goals, cost efficiency, financial overview, payment audit and corrections.
- **Acceptance:** a payment is allocated to the closed session first, then to older debts;
  payment status is derived identically in the database and in `src/lib/paymentStatus.ts`.

### 3.9 Notifications
- **Requirements:** transactional email (branded auth, booking, reminders, cancellation,
  agreements, billing) with queue, retry, TTL, dead-letter and unsubscribe; optional
  Telegram notifications; session reminders 24 h ahead via cron.
- **Acceptance:** suppressed and unsubscribed addresses are never sent to.

### 3.10 Subscription and billing
- **Requirements:** Free Starter (up to 5 active clients), Solo Practice, Pro Practice;
  monthly / quarterly (−15%) / yearly (−25%); Ukraine support campaign −50%; manual promo
  codes; Paddle overlay checkout at `/checkout`; webhook-driven subscription and
  entitlement sync; legacy subscriptions never deactivated; feature gating via
  `operational_access ⊂ financial_access ⊂ premium_access`.
- **Acceptance:** checkout opens only from the approved canonical host; a failure keeps
  the user inside Solo .Bizz with a localised retry/support screen and the chosen plan.

### 3.11 Support helpdesk
- **Requirements:** persistent help button on site and in app; answers only from the
  knowledge base, never invented; problem reports with statuses; conversation history;
  feedback; admin console for conversations, issues, analytics and KB editing.
- **Acceptance:** when the KB has no answer the bot says so instead of guessing;
  no client notes, card data or tokens are ever sent to the model.

### 3.12 Administration
- **Requirements:** admin console for users, subscriptions, reviews, bookings, domains,
  analytics, email previews, tests and support.
- **Acceptance:** every admin route and function verifies the admin role server-side.

### 3.13 Public site, legal and SEO
- **Requirements:** landing, pricing, careers, practice guide, privacy, terms, cookies,
  refund; per-route metadata with canonical and self-referencing `og:url`; sitemap and
  `llms.txt`; cookie consent with Necessary / Analytics / Marketing matching the policy;
  five-language legal copy with no platform branding.
- **Acceptance:** checkout and agreement pages are `noindex`; analytics and marketing
  scripts load only after the matching consent.

### 3.14 Privacy and GDPR
- **Requirements:** data export and erasure functions; access audit; encrypted notes
  decryptable only by the owner or the export process; retention described truthfully.
- **Acceptance:** cross-user access is impossible through any RLS policy or function.

---

## 4. Cross-cutting rules

1. **Brand:** always `Solo .Bizz` (via `BrandName`), never a variant spelling.
2. **Time:** slots and sessions use the UTC wall-clock convention end to end.
3. **i18n:** copy is edited in `src/i18n/translations.ts`; locales are generated.
   Every user-visible string exists in all five languages, with English fallback.
4. **Errors:** surfaced through `describeError()` and, where useful, with an
   "Ask Support" action; never a raw provider message.
5. **Design:** semantic tokens only — no hardcoded colours in components.
6. **Security:** RLS on every table, explicit GRANTs, roles in `user_roles`,
   secrets only in edge-function environment.

---

## 5. Known gaps in this baseline

- Paddle default payment link and approved domains are configured outside the codebase.
- No dedicated DPA / subprocessor register page; underlying providers would need naming.
- Full legal address of the operating entity is intentionally omitted — pending legal review.
- Google Calendar sync, forecasting page and push notifications are not implemented.

---

## 6. How to change this baseline

1. Write the intended change as a diff to the relevant capability above
   (intent → requirements → acceptance criteria).
2. Implement only what the updated criteria state.
3. Verify against the acceptance criteria, then update this file in the same change.
