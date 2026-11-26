# Groups — Progress

| Package | Status | Files |
|---|---|---|
| GRP-00 Audit | Done | docs/groups/* |
| GRP-01 Extraction + tabs | Done | pages/GroupDetailPage.tsx; components/groups/GroupMembersSection.tsx, GroupMeetingsSection.tsx, GroupAttendanceDialog.tsx; i18n/groupTabsText.ts |
| GRP-02 Overview | Done | components/groups/GroupMeetingsSection.tsx, GroupOverviewPanels.tsx (new); lib/groupMeetings.ts + test (new); pages/GroupDetailPage.tsx; i18n/groupTabsText.ts |
| GRP-03 Applications | Done | components/groups/GroupExtras.tsx (GroupRegistrationsCard); lib/groupApplications.ts + test (new); i18n/groupApplicationsText.ts (new); pages/GroupDetailPage.tsx (onOpenForm prop) |
| GRP-04 Participants + pricing | Done | components/groups/GroupMembersSection.tsx; lib/groupParticipants.ts + test (new); i18n/groupParticipantsText.ts (new); pages/GroupDetailPage.tsx (onOpenApplications prop) |
| GRP-04.1 Pricing display | Done | GroupMembersSection.tsx; lib/groupParticipants.ts + test; i18n/groupParticipantsText.ts |
| GRP-05 … GRP-08 | Not started | — |

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
- No published test group → end-to-end public flow unverified.
- Applications: decisions offered only for New/Waitlisted (existing rule); backend also allows rejecting a confirmed application, not exposed in UI.
- Applications: answers render from stored snapshots (label+value); applications submitted before the custom form have no snapshot answers — only phone/message (for GRP-05).
- Applications: list is client-side filtered over all loaded rows (no server pagination).
