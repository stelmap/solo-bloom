## Inactive User Deactivation & Deletion — Implementation Plan

Full lifecycle: Active → Deactivation Pending → Ready for Deletion → Deleted, with auto-reactivation on login, admin UI, emails (EN/UK), audit log, and daily cron.

---

### 1. Database (single migration)

New table `public.user_lifecycle`:
- `user_id` (PK, FK auth.users)
- `status` text: `active | deactivation_pending | ready_for_deletion | deleted` (default `active`)
- `last_login_at`, `last_activity_at` timestamptz
- `deactivation_email_sent_at`, `planned_deletion_date`, `reactivated_at`, `deleted_at` timestamptz
- `deactivated_by`, `deleted_by` uuid
- timestamps + updated_at trigger
- RLS: users can read own row; admins full access via `has_role(_,'admin')`
- GRANTs to authenticated + service_role

New table `public.user_lifecycle_audit`:
- `id`, `user_id`, `admin_id`, `user_email`, `action` (`deactivated | reactivated | marked_ready | deleted | email_sent | cancelled`)
- `previous_status`, `new_status`, `email_delivery_status`, `ip_address inet`, `metadata jsonb`, `at`
- RLS: admin read-only; service_role insert

New settings table `public.lifecycle_settings` (singleton row):
- `deletion_grace_days` int default 7
- `cron_enabled` bool default true

Trigger on `auth.users` sign-in? Not allowed — instead handled client-side on login + edge function.

RPC `public.record_user_activity()` — `SECURITY DEFINER`, updates `last_login_at`/`last_activity_at`, and if status = `deactivation_pending` & `planned_deletion_date > now()`, flips back to `active`, sets `reactivated_at`, writes audit row.

RPC `public.promote_expired_deactivations()` — service-role only, moves due `deactivation_pending` → `ready_for_deletion`.

### 2. Edge functions

- `admin-lifecycle-action` (single function, verified admin via `has_role`):
  - actions: `deactivate | cancel_deactivation | resend_email | delete_permanently | cancel_deletion`
  - deactivate: sets status, calls `send-transactional-email` with `account-deactivation-warning`, stamps `planned_deletion_date`
  - delete_permanently: verifies `confirmation === 'DELETE'`, sends `account-deleted-final` email, then calls admin API to delete `auth.users` row (cascades user data via existing GDPR delete function `process_gdpr_deletions` logic — reuse by inlining per-table deletes), stamps `deleted_at`, keeps audit row
  - all actions write audit log
- `lifecycle-cron` — invoked by pg_cron daily; runs `promote_expired_deactivations` RPC and returns counts

Add pg_cron schedule (via `insert` tool after migration): daily at 03:00 UTC calling `lifecycle-cron` via `net.http_post`.

### 3. Email templates (React Email, EN + UK)

Two new templates in `supabase/functions/_shared/transactional-email-templates/`:
- `account-deactivation-warning.tsx` — subject/body per spec, includes login CTA to `https://solo-bizz.com/auth`
- `account-deleted-final.tsx`

Both accept `{ locale: 'en' | 'uk', loginUrl }`. Register in `registry.ts`.

### 4. Client integration

- `src/contexts/AuthContext.tsx`: on `SIGNED_IN` event, call `supabase.rpc('record_user_activity')` (fire-and-forget). Ensures auto-reactivation.
- Extend `admin-list-users` edge function to left-join `user_lifecycle` and return status + lifecycle timestamps.

### 5. Admin UI — `src/pages/AdminUsersPage.tsx`

Add columns: Status (badge), Last activity, Deactivation email sent, Planned deletion, Reactivated, Deleted.
Add filters: status, last-login range, planned deletion range.
Add row-action dropdown per user based on status:
- active → Deactivate
- deactivation_pending → Cancel deactivation, Resend email
- ready_for_deletion → Delete permanently (typed `DELETE` confirmation), Cancel deletion
- deleted → none

Dialogs styled with existing `AlertDialog` + `ConfirmDeleteDialog` patterns.

### 6. Tests

Vitest units in `src/lib/__tests__/`:
- `userLifecycle.test.ts` — pure state machine helpers (allowed actions per status, planned-deletion date math with configurable grace, reactivation eligibility)

### 7. Out of scope for this pass

- Full GDPR anonymization of retained business records (existing `process_gdpr_deletions` handles cascade of user-owned tables — we call the same logic)
- IP address capture beyond the request header (best-effort)
- Bulk deactivation UI (single-user actions only)

---

Approve and I'll ship the migration first, then functions + UI in one pass.
