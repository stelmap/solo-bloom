## Phase 1 — Deletion executor cron (safe, small)

- Enable `pg_cron` and `pg_net` extensions.
- Add `public.process_gdpr_deletions()` security-definer function: for every row in `gdpr_deletion_requests` where `scheduled_for <= now()` AND `executed_at IS NULL` AND `cancelled_at IS NULL`, delete the user's rows across all owned tables (clients, client_notes, appointments, income, expenses, invoices, supervisions, attachments, etc.), then delete the auth user via `auth.admin` is not callable from SQL — instead we mark `executed_at` and call the `gdpr-erase` edge function with the service role from a second cron entry, OR delete app data here and leave auth user removal to manual / edge function.
- Schedule daily at 03:00 UTC via `cron.schedule`.
- Audit each execution into `data_access_audit` (action=`gdpr_deletion_executed`).

## Phase 2 — Scoped column-level encryption

Use `pgcrypto` (already standard) + a master key stored in **Supabase Vault**. Symmetric AES via `pgp_sym_encrypt` / `pgp_sym_decrypt`.

**Encrypt (free-text, never searched/sorted in SQL):**
- `client_notes.content`
- `appointments.notes`, `appointments.cancellation_reason`, `appointments.price_override_reason`
- `payment_corrections.correction_comment`
- `client_attachments.file_name` (display only)
- `clients.notes`, `clients.archive_comment`, `clients.billing_address`, `clients.billing_tax_id`, `clients.billing_company_name`

**Do NOT encrypt (needed for search/joins/filters):**
- `clients.name`, `clients.email`, `clients.phone` — used for search, dedup, invoicing recipient. Encrypting breaks UX. Documented as residual risk; access controlled by RLS.

**Mechanism (transparent to frontend):**
1. New column `<col>_ct bytea` next to each plaintext column.
2. BEFORE INSERT/UPDATE trigger encrypts plaintext into `_ct` and nulls the plaintext column.
3. Replace table reads with a security-barrier **view** (`clients_v`, `client_notes_v`, etc.) that decrypts `_ct` back to the original column name. RLS on view = `auth.uid() = user_id`.
4. Frontend keeps using `from('clients')` — we rename original table to `clients_raw`, point view at it via the original name. **OR** simpler: keep table name, expose decrypted column via a generated/computed column using a SECURITY DEFINER function. We'll use the view approach (cleaner, no per-row function call surprises).
5. Backfill: one-shot UPDATE encrypting existing plaintext, then DROP plaintext column.

**Key management:** master key in `vault.secrets` as `gdpr_master_key`. Decryption function is SECURITY DEFINER and only callable from the views.

## Phase 3 — Session timeout + forced MFA

- **Session timeout:** add `useIdleTimeout` hook in frontend. After 30 min idle → `supabase.auth.signOut()` + redirect to `/auth`. Configurable in Privacy tab.
- **Forced MFA:** Enable TOTP in Supabase auth config. Add `MfaEnrollment.tsx` in Settings → Security tab. Gate the app (in `App.tsx` route guard): if user has no enrolled factor AND `profiles.mfa_required = true`, redirect to enrollment. Default `mfa_required = true` for new accounts.

## File changes

- 1 migration: cron + extensions + `process_gdpr_deletions()`
- 1 migration: encryption (pgcrypto, vault key reference, `_ct` columns, triggers, views, backfill, drop plaintext)
- 1 migration: `profiles.mfa_required` column
- Frontend: `src/hooks/useIdleTimeout.ts`, `src/components/settings/SecuritySection.tsx`, `src/components/auth/MfaEnrollment.tsx`, route guard update in `App.tsx`, Privacy tab additions.

## Risks / what I need confirmation on

1. **Encryption of `clients.email`** — if you want it encrypted, search-by-email and the invoice "send to client" flow break unless we add a deterministic hash column. Current plan: leave plaintext. Confirm?
2. **Auth user deletion in cron** — `pg_net` can POST to the `gdpr-erase` edge function with the service role to actually delete the `auth.users` row. OK to use that pattern?
3. **MFA forced on existing users** — should existing accounts be grandfathered (opt-in) or forced to enroll on next login? Recommend opt-in for existing, required for new signups.

Tell me yes/no on each and I'll execute Phase 1 immediately, then 2, then 3.