# Groups — Progress

| Package | Status | Files |
|---|---|---|
| GRP-00 Audit | Done | docs/groups/* |
| GRP-01 Extraction + tabs | Done | pages/GroupDetailPage.tsx; components/groups/GroupMembersSection.tsx, GroupMeetingsSection.tsx, GroupAttendanceDialog.tsx; i18n/groupTabsText.ts |
| GRP-02 Overview | Done | components/groups/GroupMeetingsSection.tsx, GroupOverviewPanels.tsx (new); lib/groupMeetings.ts + test (new); pages/GroupDetailPage.tsx; i18n/groupTabsText.ts |
| GRP-03 … GRP-08 | Not started | — |

## Unresolved gaps
- Per-person price: `useUpdateGroupMemberPrice` exists but no UI control in Participants.
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
