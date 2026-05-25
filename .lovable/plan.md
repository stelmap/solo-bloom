# GDPR Hardening Plan

Goal: make the app GDPR-defensible. Lovable Cloud's Supabase already gives you encryption-at-rest on disk and TLS in transit. What's missing for GDPR is **field-level encryption of sensitive data, an access audit trail, and user-facing data rights (export + erasure)**.

Reality check up front: a database administrator with raw Postgres access could still read your data today. The plan below uses **pgsodium / pgcrypto with keys held in Supabase Vault**, which means even a direct DB dump returns ciphertext — only the app (going through Postgres functions) can decrypt. That's the standard GDPR "state of the art" bar for a SaaS of this size.

## Scope of encryption

Encrypted at rest (column-level, transparent to the UI):
- `clients`: `name`, `email`, `phone`, `notes`, `telegram`, `billing_company_name`, `billing_tax_id`, `billing_address`, `archive_comment`
- `client_notes`: `content`
- `client_attachments`: `file_name` (the binary file is already separate; see storage section)
- `appointments`: `notes`, `cancellation_reason`, `price_override_reason`
- `supervisions`: `imported_notes_snapshot`, `supervisor_feedback`, `next_steps`, `supervision_outcome`
- `payment_corrections`: `correction_comment`

NOT encrypted (needed for queries / not personal data):
- `appointments.price`, `status`, `scheduled_at`, `payment_status` (financial metadata, needed for sorting/filtering — pseudonymised by the encrypted client name)
- IDs, timestamps, foreign keys

## Technical approach

```text
┌──────────────┐    HTTPS    ┌────────────────┐    pgsodium    ┌───────────┐
│  React app   │ ──────────▶ │ Postgres views │ ─────────────▶ │ Vault key │
│ (plain text) │ ◀────────── │  + RPC wrappers│ ◀───────────── │  (master) │
└──────────────┘             └────────────────┘                └───────────┘
                                     │
                                     ▼
                             ciphertext columns
```

1. Enable `pgsodium` extension; create one master key in `pgsodium.key`.
2. For each encrypted column, rename current column → `<name>_ct` (bytea, encrypted) and create a **security-definer view** that decrypts on SELECT for the row owner only.
3. Frontend keeps querying `clients`, `client_notes`, etc. — those become updatable views. No frontend code changes.
4. Write trigger encrypts on INSERT/UPDATE before writing to `_ct`.
5. Backfill existing rows once.

## Storage (attachments)

`client-attachments` bucket stays as-is for now (Supabase encrypts at rest). Add:
- `private` ACL only (verify, fix if public)
- Signed URLs with 5-min TTL instead of any direct URLs
- Optional follow-up: client-side encrypt files before upload using a per-user key derived from their session (more complex, can be a v2)

## Audit log

New table `data_access_audit`:
- `user_id`, `action` (read/write/delete/export), `entity_type`, `entity_id`, `at`, `ip_hash`, `user_agent`
- Triggers on the 6 sensitive tables log every write.
- An `audit_read(entity_type, entity_id)` RPC the frontend calls when opening a client detail page (best-effort read logging — DB-level read logging would require pgaudit which isn't available here).
- RLS: users see only their own audit rows; retain 2 years.

## GDPR user rights endpoints

Two edge functions:
1. `gdpr-export` — returns a ZIP/JSON of all the authenticated user's data (clients, notes, appointments, attachments via signed URLs). Logged in audit.
2. `gdpr-erase` — hard-deletes the user's workspace + auth account after a 7-day grace period (sets `deletion_scheduled_at`, cron deletes). Audit-logged.

Settings page gets a new "Privacy & data" tab with: Download my data / Delete my account / View access log.

## What I will NOT do in this pass

- Per-user key encryption with the password as KEK (locks out password reset, big UX cost — separate decision)
- Replacing Resend or PostHog (they don't touch client PHI; PostHog already gets only `user.id`, no PII)
- Formal DPA documents (legal work, outside code)
- Pseudonymising backups (Supabase-managed, outside our control without self-hosting)

## File / migration touch list

- **Migrations** (one combined): enable pgsodium, create master key, add `_ct` columns, encrypt-on-write triggers, decrypting views, backfill, `data_access_audit` table + triggers + RLS, `gdpr_deletion_requests` table.
- **Edge functions**: `gdpr-export/index.ts`, `gdpr-erase/index.ts`, `gdpr-process-deletions/index.ts` (cron).
- **Frontend**:
  - `src/components/settings/PrivacySection.tsx` (new)
  - `src/pages/SettingsPage.tsx` (add tab)
  - `src/i18n/locales/*.ts` (4 files, new strings)
  - `src/hooks/useGdpr.ts` (new)
  - `src/lib/audit.ts` (new — fire-and-forget read logging)
  - Wire `audit.ts` into `ClientDetailPage.tsx`, `GroupDetailPage.tsx`
- **Docs**: `docs/gdpr-compliance.md` describing the model, what's covered, what isn't.

## Order of execution

1. Migration (encryption + audit + deletion table) — biggest blast radius, do first with backup verification
2. Edge functions
3. Frontend Privacy tab + audit hooks
4. Translations + docs

Estimated changes: ~12 files, 1 large migration, 3 edge functions. After implementation we run the Supabase linter and full test suite before publishing.
