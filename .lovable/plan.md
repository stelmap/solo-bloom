# Information Agreement — Implementation Plan

Delivers the spec in `Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx` as a therapist-owned versioned template, a client-specific agreement instance, a secure recipient-bound link with email OTP, immutable acceptance evidence, and an accepted document stored in the client card.

Full spec is saved to `docs/information-agreement-spec.md` in Phase 0 so all details (business rules BR-1..N, error catalogue, traceability matrix) stay accessible during build.

---

## Phase 0 — Foundations (1 turn)

- Save spec to `docs/information-agreement-spec.md`.
- Add feature flag `information_agreement` (default OFF) so we can ship phases behind a switch.
- Seed the Ukrainian starter template content as a JSON fixture in `supabase/seed/agreement-starter-uk.json`.

---

## Phase 1 — Data model & security (1 turn, DB migration)

New tables (all with GRANTs + RLS, scoped by `user_id = auth.uid()` for therapist rows):

```text
agreement_templates          therapist-owned master; latest_version_id
agreement_template_versions  immutable content + controls (JSONB), status: draft|active|archived
agreement_instances          one per client; template_version_id, client_id, status
agreement_revisions          frozen shareable snapshot; content_hash
agreement_invitations        token_hash (never raw), expires_at, revoked_at, email_bound
agreement_otp_challenges     otp_hash, attempts, expires_at, invitation_id
agreement_verified_sessions  short-lived server session bound to one revision
agreement_acceptances        answers JSONB, typed_name, ip, ua, accepted_at, evidence_hash
agreement_audit_events       correlation_id, event_type, safe metadata only
accepted_documents           rendered HTML/PDF stored in Storage bucket + row metadata
```

Storage bucket `agreement-documents` (private, RLS by therapist).

Business-rule enforcement handled in edge functions, not client SQL.

---

## Phase 2 — Settings: template editor (2–3 turns)

Route: `/settings/agreements`

- List templates + version history.
- Draft editor: rich text sections, insertable variables (`{{client.first_name}}`, `{{therapist.business_name}}`, etc.), configurable controls (required checkbox, optional checkbox, typed acknowledgement).
- Desktop/mobile preview.
- Validate → Activate flow (exactly one Active version per template).
- Archive obsolete versions.
- Ukrainian UI first, i18n keys added for en/ru/pl/fr.

---

## Phase 3 — Client card: agreement instance (2 turns)

In `ClientDetailPage` add a **Documents / Agreements** section:

- Create instance from Active template → client-specific snapshot.
- Allow per-client edits before sharing.
- Precondition validation: client has deliverable email.
- Generate secure link (`/agreement/:token`, high-entropy, token_hash stored server-side).
- Copy / Revoke / Regenerate actions.
- Status timeline: Draft → Sent → Opened → Verified → Accepted / Revoked / Expired.
- Read-only view of accepted document.

---

## Phase 4 — Public client flow (2–3 turns)

Public route `/agreement/:token` (no Solo.Bizz account required):

- Resolve token server-side → return only revision id + email hint (`o***@gmail.com`).
- Uniform failure response (no info leak about existence).
- Request OTP → email via `send-transactional-email` (new template `agreement-otp`).
- OTP verify → mint short-lived verified session cookie bound to that revision.
- Render frozen revision content + interactive controls.
- Submit once (idempotent): store answers, typed name, evidence hash, audit events.
- Show safe completion page.
- Rate limiting + attempt counters + lockout.

Edge functions: `agreement-resolve-token`, `agreement-request-otp`, `agreement-verify-otp`, `agreement-submit`.

---

## Phase 5 — Accepted document generation & storage (1–2 turns)

- Render final HTML server-side from frozen snapshot + answers.
- Compute `evidence_hash` (sha256 of canonicalized JSON).
- Save HTML (and PDF via existing invoice PDF pipeline) to `agreement-documents` bucket.
- Link to `accepted_documents` row visible in client card.
- Invalidate invitation, transition to `Accepted` atomically.

---

## Phase 6 — Audit, security hardening, tests (1–2 turns)

- Structured audit rows for every state transition (no body/OTP/token/full email in logs).
- Automated tests:
  - Unit: token binding, OTP throttle, snapshot immutability, evidence hash stability.
  - E2E: therapist creates template → shares → client OTP flow → accepted doc appears in client card.
- Add to Admin Tests registry.
- Security scan pass on new tables/functions.

---

## Explicitly out of scope (per spec §2.3)

Guardian consent, multi-party signing, arbitrary DOCX upload, real-time collab, therapist counter-signature, qualified e-signature certification, general client portal.

---

## Deliverable cadence

Each phase is one review/approval checkpoint. I'll pause after each phase for you to test before starting the next.

Reply **approve** to start with Phase 0 + Phase 1 (spec doc + database migration), or tell me which phase to prioritise or adjust.
