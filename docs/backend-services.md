# Backend Services

## Overview

The backend is powered by Supabase, which provides:
- **PostgreSQL database** with Row-Level Security
- **Auth service** (email/password, Google OAuth, password recovery)
- **Edge Functions** (Deno-based serverless functions)
- **Storage** (authenticated file uploads)
- **Realtime** (available but not currently used)

## Service Map

### 1. Authentication Service
**Provider:** Supabase Auth (built-in)

| Feature | Status |
|---------|--------|
| Email/password signup | ✅ |
| Google OAuth | ✅ |
| Email verification | ✅ |
| Password recovery | ✅ |
| Session management | ✅ |
| Auto token refresh | ✅ |

**Files:**
- `src/contexts/AuthContext.tsx` — auth state provider
- `src/pages/AuthPage.tsx` — login/signup UI
- `src/pages/ResetPasswordPage.tsx` — password reset UI
- `src/components/ProtectedRoute.tsx` — route guard

### 2. User Profile Service
**Provider:** `profiles` table + RLS

Stores user preferences: business name, work hours, language, session defaults, onboarding status.

**Files:**
- `src/hooks/useData.ts` — `useProfile()`, `useUpdateProfile()`
- `src/pages/OnboardingPage.tsx` — initial setup
- `src/pages/SettingsPage.tsx` — settings management

### 3. Client Management Service
**Provider:** `clients`, `client_notes`, `client_attachments` tables + RLS

| Feature | Status |
|---------|--------|
| CRUD clients | ✅ |
| Client search/filter | ✅ |
| Session notes per client | ✅ |
| File attachments | ✅ |
| Client detail view | ✅ |

### 4. Services/Products Service
**Provider:** `services` table + RLS

Manages the service catalog with name, price, and duration.

### 5. Appointments Service
**Provider:** `appointments` table + RLS

| Feature | Status |
|---------|--------|
| Create/edit/delete appointments | ✅ |
| Status tracking (scheduled/completed/cancelled) | ✅ |
| Payment status tracking | ✅ |
| Calendar view | ✅ |
| Link to client and service | ✅ |

### 6. Recurring Appointments Service
**Provider:** `recurring_rules` table + RLS

Stores recurrence rules (weekly, custom days, interval). Individual occurrences are created as separate appointment records linked via `recurring_rule_id`.

### 7. Finance Service
**Provider:** `income`, `expected_payments`, `expenses` tables + RLS

| Feature | Status |
|---------|--------|
| Track actual income | ✅ |
| Track expected/pending payments | ✅ |
| Mark expected as paid | ✅ |
| Expense management | ✅ |
| Recurring expenses | ✅ |
| Monthly/yearly breakdowns | ✅ |

### 8. Tax Service
**Provider:** `tax_settings` table + RLS

Supports percentage-based and fixed-amount taxes with configurable frequency and calculation basis.

### 9. Dashboard / Analytics Service
**Provider:** Client-side aggregation in `useData.ts`

Aggregates data from appointments, income, expenses to produce dashboard metrics. Currently computed client-side.

### 10. Break-even Service
**Provider:** `breakeven_goals` table + client-side calculation

Configurable goals with fixed expenses, desired income, and buffer. Progress calculated from actual income data.

### 11. File Storage Service
**Provider:** Supabase Storage with RLS

- Bucket: `client-attachments`
- Auth-only access
- File metadata stored in `client_attachments` table
- Size/type validation on upload

### 12. Email Service
**Provider:** Edge Functions + Lovable Email SDK

- `auth-email-hook` — custom branded auth emails
- `process-email-queue` — queue-based email processor with retry, TTL, DLQ
- Custom domain: `notify.one-bizz.com`

### 13. Working Schedule Service
**Provider:** `working_schedule`, `days_off` tables + RLS

Manages weekly work hours and exceptions (holidays, sick days, custom hours).

## Not Yet Implemented

| Service | Notes |
|---------|-------|
| Billing/Subscription | Stripe integration skipped for now |
| Google Calendar Sync | Requires Google API setup |
| Scheduled Reminders | Needs cron-based edge function |
| Forecasting Engine | Future projections page |
| Push Notifications | For mobile wrapper |
