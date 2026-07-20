# Client Language as Single Source of Truth

Rework the app so **Client Card → Client Language** drives every client-facing document, email and notification. Remove language selection from Information Agreement creation and any implicit derivation from country/browser/interface.

## Phase 1 — Client profile field

- DB migration: add `clients.communication_language TEXT` (nullable during backfill, no default). Allowed values enforced by trigger: `uk | ru | en | pl`.
- Add "Client language" field to:
  - Create Client dialog (`ClientsPage.tsx`)
  - Edit Client form (`ClientDetailPage.tsx`)
  - Client Card details display
- Placed next to/after Country, with localized help text (uk/ru/en/pl/fr).
- Required on create + edit. Save blocked with localized validation.
- On existing clients without a value: show badge **"Мову клієнта не вибрано"** in Client Card + client list.
- Add filter chip in Clients list (uk / ru / en / pl / not selected).
- Audit events: `CLIENT_LANGUAGE_SET`, `CLIENT_LANGUAGE_CHANGED` (previous, new, actor, client, timestamp) via existing `client_status_audit`-style table (new `client_language_audit` or reuse pattern).

## Phase 2 — Central language resolver

- New file `src/lib/clientCommunicationLanguage.ts`:
  - `resolveClientCommunicationLanguage(clientId): 'uk'|'ru'|'en'|'pl'`
  - Throws typed error `CLIENT_LANGUAGE_MISSING` when null/unsupported.
- Edge-function equivalent in `supabase/functions/_shared/client-language.ts` used by all send functions.
- Reusable UI helper `<MissingClientLanguageGuard/>` — blocks action, shows message + **"Відкрити картку клієнта"** button.

## Phase 3 — Information Agreement

- Remove any "document language" selector from the Create Agreement flow (`ClientAgreementsCard.tsx` / agreement creation dialog).
- On create:
  1. Call resolver.
  2. Look up active `agreement_templates` where `language = client.communication_language`.
  3. If none → block with "Немає активного шаблону цією мовою" + actions to Templates / Client card.
  4. Snapshot language into `agreement_instances.language`, `agreement_revisions.language`, `agreement_invitations.language`.
- Public flow (`PublicAgreementPage`, OTP request/verify functions) already reads snapshot language — verify + fix any place still using interface language.
- Handle Client Language change while an unaccepted invitation exists: show modal offering **Keep** / **Revoke & recreate**.
- Accepted documents remain immutable.

## Phase 4 — Notifications wired to client language

Update each send site to call the resolver and pass `language` to the template:

- `send-transactional-email` invocations from:
  - `agreement-otp-request`, `agreement-invitation` (OTP + invite emails)
  - `send-session-reminders`
  - Session created / rescheduled / cancelled by therapist / cancelled by client / confirmation (find call sites in `useData.ts`, `SessionDetailSheet.tsx`, `BookingDialog.tsx`)
  - Invoice sent / payment reminder (where present)
- All React Email templates already accept a `locale` prop — extend where missing (uk/ru/en/pl variants).
- Internal therapist notifications keep using therapist interface language.

## Phase 5 — Placeholders, dates, services

- Central placeholder resolver validates required fields before send; blocks on missing.
- Date formatting helper uses locale map `uk→uk-UA`, `ru→ru`, `en→en-GB`, `pl→pl-PL`.
- Service name: if selected service lacks a translated `name_<lang>`, prompt therapist to provide it and block send. (Add `service_translations` table or JSON column `services.name_i18n`.)

## Phase 6 — Migration & tests

- Backfill: mark existing clients as `NULL` (no guessing). No automatic assignment.
- Vitest: resolver, blocking behaviour, snapshot correctness.
- Playwright e2e: create client without language → blocked; create Ukrainian client → agreement is uk; change language mid-invite → warning modal.
- Register new suites in `src/lib/testRegistry.ts`.

## Technical notes

- Language code column, not display strings. Localized names rendered from i18n dictionaries in all 5 interface locales.
- No CHECK constraint with dynamic list — use trigger for validation (per project rules).
- `agreement_instances.language` already exists; verify & reuse rather than adding new columns where possible (will confirm via `supabase--read_query` before migration).
- Audit uses existing `data_access_audit` / `client_status_audit` patterns.

## Deliverables reported after implementation

Migration summary, changed client fields, connected communication types, template structure, count of legacy clients missing language, new automated tests, and any client-facing notifications still not wired.

---

This is a large multi-phase change touching DB schema, ~15 edge functions, agreement flow, notifications, and UI. Approve to proceed, or tell me to start with a subset (e.g. Phase 1+3 only).