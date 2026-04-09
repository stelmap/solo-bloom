# Architecture Overview

## System Architecture

This is a **SaaS application for solo professionals** (therapists, coaches, tutors, etc.) built as a React single-page application with a Supabase backend.

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│         React 18 + Vite 5 + TypeScript       │
│         Tailwind CSS + shadcn/ui             │
├─────────────────────────────────────────────┤
│              Supabase Client SDK             │
├──────────────┬──────────────────────────────┤
│   Supabase   │                              │
│   Auth       │     Supabase Edge Functions   │
│              │     (Deno runtime)            │
├──────────────┼──────────────────────────────┤
│         PostgreSQL Database                  │
│         Row-Level Security (RLS)             │
├─────────────────────────────────────────────┤
│         Supabase Storage (files)             │
└─────────────────────────────────────────────┘
```

## Project Structure

```
├── src/                    # Frontend application
│   ├── components/         # Reusable UI components
│   │   └── ui/             # shadcn/ui primitives
│   ├── contexts/           # React contexts (Auth)
│   ├── hooks/              # Custom hooks (useData.ts = data layer)
│   ├── i18n/               # Internationalization (EN/UK)
│   ├── integrations/       # Auto-generated Supabase client & types
│   ├── lib/                # Utilities (capacity calc, CSV export)
│   ├── pages/              # Route-level page components
│   └── assets/             # Static assets
├── supabase/
│   ├── functions/          # Edge Functions (backend logic)
│   │   ├── auth-email-hook/    # Custom auth email templates
│   │   └── process-email-queue/ # Email queue processor
│   ├── migrations/         # Database migrations (read-only)
│   └── config.toml         # Supabase project config
├── docs/                   # Project documentation
├── scripts/                # Developer utility scripts
└── public/                 # Static public files
```

## Key Design Decisions

### Data Layer
All database operations are centralized in `src/hooks/useData.ts` using TanStack React Query. This provides:
- Automatic caching and invalidation
- Optimistic updates where appropriate
- Consistent error handling
- User-scoped queries via `useAuth()`

### Authentication
- Supabase Auth with email/password + Google OAuth
- Password recovery flow with dedicated `/reset-password` route
- Auth state managed via `AuthContext` provider
- Protected routes via `ProtectedRoute` component

### Security
- All tables use Row-Level Security (RLS)
- Every query is scoped to `auth.uid()`
- File storage uses authenticated access only
- Edge functions validate JWT tokens

### Internationalization
- English (en) and Ukrainian (uk) supported
- Translations in `src/i18n/translations.ts`
- Language context wraps the entire app

### Email Infrastructure
- Custom email domain: `notify.one-bizz.com`
- Queue-based email processing via edge function
- Rate limiting, TTL, retry logic, and dead-letter queue
- Custom branded auth email templates (signup, recovery, etc.)

## Database Schema (Core Entities)

| Table | Purpose |
|-------|---------|
| `profiles` | User settings (business name, work hours, language) |
| `clients` | Client records |
| `client_notes` | Notes linked to clients/appointments |
| `client_attachments` | File attachments for clients/sessions |
| `services` | Service catalog with pricing |
| `appointments` | Individual sessions/appointments |
| `recurring_rules` | Rules for generating recurring appointments |
| `income` | Actual received income |
| `expected_payments` | Pending/unpaid completed sessions |
| `expenses` | Business expenses |
| `tax_settings` | Tax configuration (rate, type, frequency) |
| `breakeven_goals` | Break-even calculation goals |
| `working_schedule` | Weekly working hours per day |
| `days_off` | Holidays, sick days, custom hours |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 |
| Build Tool | Vite 5 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| State/Data | TanStack React Query |
| Routing | React Router 6 |
| Charts | Recharts |
| Animation | Framer Motion |
| Backend | Supabase (Auth, DB, Storage, Edge Functions) |
| Database | PostgreSQL with RLS |
| Email | Lovable Email SDK |
| Testing | Vitest + Playwright |
