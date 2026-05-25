# GDPR Compliance

## What is covered

| Requirement | Article | Status | Implementation |
|---|---|---|---|
| Encryption in transit | Art. 32 | ✅ | TLS 1.2+ enforced by Supabase / Lovable Cloud |
| Encryption at rest (disk) | Art. 32 | ✅ | Supabase Postgres + Storage disk encryption |
| Access control | Art. 32 | ✅ | Row-Level Security on every table |
| Audit trail (writes + reads) | Art. 30 / 32 | ✅ | `data_access_audit` table + write triggers + `audit_read()` RPC |
| Right of access | Art. 15 | ✅ | `gdpr-export` edge function → JSON download |
| Right to portability | Art. 20 | ✅ | Same JSON export, machine-readable |
| Right to erasure | Art. 17 | ✅ | `gdpr-erase` edge function, 7-day grace period |
| User-facing privacy panel | Art. 12 | ✅ | Settings → Privacy & Data |
| EU data residency | — | ✅ | Frankfurt region |

## What is NOT yet covered (accepted risks)

1. **Column-level encryption.** Personal data is stored in plaintext within Postgres. A database administrator with raw access could read it. Disk-level encryption mitigates physical theft but not insider access. Planned: `pgsodium` column encryption for free-text fields (`client_notes.content`, `appointments.notes`, supervision fields, `clients.notes`, `clients.archive_comment`, `payment_corrections.correction_comment`).
2. **Client-side file encryption.** Attachments rely on Supabase Storage server-side encryption.
3. **Automatic deletion executor.** The `gdpr_deletion_requests` table is populated, but a cron edge function to physically remove rows + auth user after the grace period is not yet deployed. Manual processing required until then.
4. **DPA / sub-processor list.** Legal documents (DPA template, list of sub-processors: Supabase, Lovable, Resend, PostHog, Stripe) must be drafted separately and linked from the public site.
5. **Cookie consent banner.** Required for EU visitors. Not yet implemented.

## Architecture

```
Frontend ──▶ Supabase (EU/Frankfurt) ──▶ Storage (encrypted at rest)
   │              │
   │              ├─ RLS: auth.uid() = user_id on all sensitive tables
   │              ├─ Triggers: tg_audit_write() on 6 sensitive tables
   │              └─ RPC: audit_read() for view-tracking
   │
   ├─ /functions/v1/gdpr-export  → JSON dump of caller's rows
   └─ /functions/v1/gdpr-erase   → schedule / cancel deletion
```

## Audited tables

`clients`, `client_notes`, `appointments`, `supervisions`, `client_attachments`, `payment_corrections`.

## Operational notes

- Audit log retains entries indefinitely; consider a 24-month TTL cleanup job before scaling.
- The export currently bundles audit log entries too (transparency).
- Deletion grace period is 7 days; user can cancel from Settings → Privacy & Data.
