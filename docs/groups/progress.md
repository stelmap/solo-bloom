# Groups — Progress

| Package | Status | Files |
|---|---|---|
| GRP-00 Audit | Done | docs/groups/* |
| GRP-01 Extraction + tabs | Done | pages/GroupDetailPage.tsx; components/groups/GroupMembersSection.tsx, GroupMeetingsSection.tsx, GroupAttendanceDialog.tsx; i18n/groupTabsText.ts |
| GRP-02 Overview | Done | components/groups/GroupMeetingsSection.tsx, GroupOverviewPanels.tsx (new); lib/groupMeetings.ts + test (new); pages/GroupDetailPage.tsx; i18n/groupTabsText.ts |
| GRP-03 Applications | Done | components/groups/GroupExtras.tsx (GroupRegistrationsCard); lib/groupApplications.ts + test (new); i18n/groupApplicationsText.ts (new); pages/GroupDetailPage.tsx (onOpenForm prop) |
| GRP-04 Participants + pricing | Done | components/groups/GroupMembersSection.tsx; lib/groupParticipants.ts + test (new); i18n/groupParticipantsText.ts (new); pages/GroupDetailPage.tsx (onOpenApplications prop) |
| GRP-04.1 Pricing display | Done | GroupMembersSection.tsx; lib/groupParticipants.ts + test; i18n/groupParticipantsText.ts |
| GRP-05 Form configuration | Done | components/groups/GroupFormEditor.tsx; GroupExtras.tsx (GroupPublicationCard `actions` slot); lib/groupForm.ts + test; i18n/groupFormConfigText.ts (new); pages/GroupDetailPage.tsx (form tab); pages/PublicGroupSignupPage.tsx (minimal: form title/intro, input types) |
| GRP-06 Public registration page | Done | pages/PublicGroupSignupPage.tsx; lib/groupSignupValidation.ts + test (new); i18n/groupSignupText.ts (new); drizzle 0035 (replaces submit RPC validation only) |
| 27 Nov — Calendar synchronization | Implemented; core browser flow verified; recurrence-pattern QA outstanding | hooks/useData.ts, useGroups.ts, usePracticeLiveUpdates.ts; pages/CalendarPage.tsx; GroupMeetingsSection.tsx; lib/groupMeetings.ts, groupSessionSync.ts + tests |
| 27 Nov — Applications workspace | Verified desktop/mobile + search, confirmation, bulk transfer | AppLayout.tsx; GroupDetailPage.tsx; GroupExtras.tsx; groupCorrectionsText.ts |
| 27 Nov — Rich form description | Saved/editor/public rendering verified | RichTextEditor.tsx; GroupFormEditor.tsx; PublicGroupSignupPage.tsx; groupDescription.ts + test |
| 27 Nov — Unpublished preview | Verified saved-only, no submission/tracking, anonymous denial | GroupFormEditor.tsx; PublicGroupSignupPage.tsx + test |
| 27 Nov — Remove public group information | Removed group name/type/description/upcoming meetings from public form and shared owner preview; retained configured form image/title/intro, fields and submission behavior | pages/PublicGroupSignupPage.tsx |

Details and acceptance evidence: [27 November verification](verification-2026-11-27.md). No database migrations or pricing/approval changes in this package.

## Unresolved gaps
- Pricing (GRP-04.1): billing charges member `price_per_session`, else the specific meeting price. Participants UI now shows "Uses meeting price" without override, individual amount + currency with override, group default price shown separately as reference only; note that changes never recalculate existing charges/payments.
- Participants: browser E2E with isolated data not run in GRP-04 (unit tests + type check only).
- Group has no own service field; header shows service of its meetings.
- Header service shown only when all group meetings share one service.
- Overdue open meetings appear in History with a "status not updated" flag.
- Recent activity covers application submissions/decisions only (no stored events for meetings, attendance or payments).
- Add Meeting requires at least one participant and an active group (existing rule).
- No Analytics view; metrics must be derived (funnel, attendance, revenue).
- Refunds not represented in finance calculations (no defined model).
- Applicant emails not sent to anonymous submitters (on-screen confirmation only).
- Materials are HTTPS links only (no file upload).
- Public submission, new/existing/archived client confirmation, membership and bulk transfer verified on isolated test data on 27 November.
- Applications: decisions offered only for New/Waitlisted (existing rule); backend also allows rejecting a confirmed application, not exposed in UI.
- Applications: answers render from stored snapshots (label+value); applications submitted before the custom form have no snapshot answers — only phone/message (for GRP-05).
- Applications: client-side filtering over paginated complete reads; no server-side search.
- Form (GRP-05): title/intro stored inside existing `registration_form` JSON (no migration). Email/phone/url now validated server-side (GRP-06, RPC errors carry field id). History is preserved by existing per-application snapshots (label/type/value at submit). Browser E2E with isolated data not run.
- Public page (GRP-06): E2E done on temporary test group (cleaned up). Group information removed on 27 November; configured form content remains. Duplicate dropdown options compared exactly.
- BUG-GRP-001: existing confirmation reactivates archived matched clients per owner decision; verified without duplicate client creation on 27 November. No approval RPC change in this package.
