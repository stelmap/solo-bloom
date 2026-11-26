# Groups — Current State (GRP-00 audit, 2026-11-26)

## Routes
- `/groups` → `src/pages/GroupsPage.tsx` (list, create)
- `/groups/:id` → `src/pages/GroupDetailPage.tsx` (single scrolling page, no tabs)
- `/group/:token` → `src/pages/PublicGroupSignupPage.tsx` (public, anonymous)

## Components
| Area | Component | File |
|---|---|---|
| Header actions (edit, copy, archive, delete, message) | inline in page | GroupDetailPage.tsx |
| Group settings (type, price, capacity, instructions, absent billing) | `GroupSettingsFields`, `settingsFromGroup/ToPatch` | components/groups/GroupExtras.tsx |
| Publication / public link | `GroupPublicationCard` | GroupExtras.tsx |
| Applications, approve/reject/waitlist, transfer | `GroupRegistrationsCard` | GroupExtras.tsx |
| Participant email | `GroupMessageDialog` → edge fn `send-group-email` | GroupExtras.tsx |
| Form configuration + image | `GroupFormEditorCard` | components/groups/GroupFormEditor.tsx |
| Finance summary (charged/received/outstanding/debtors) | `GroupFinanceCard` | GroupFormEditor.tsx |
| Members list, add/remove, per-member price | inline + dialogs | GroupDetailPage.tsx |
| Meetings list + "Add meeting" (navigates to Calendar with groupId) | inline | GroupDetailPage.tsx |
| Attendance | `AttendanceDialog` (local fn) | GroupDetailPage.tsx |

## Hooks (`src/hooks/useGroups.ts`)
Queries: `useGroups`, `useGroup`, `useGroupMembers`, `useGroupSessions`, `useGroupAttendance`, `useGroupAllAttendance`, `useGroupSessionPayments`, `useGroupRegistrations`.
Mutations: `useCreateGroup`, `useUpdateGroup`, `useDeleteGroup` (logical), `useAddGroupMember`, `useRemoveGroupMember`, `useUpdateGroupMemberPrice`, `useCreateGroupSession`, `useCompleteGroupSession`, `useUpdateAttendance`, `useDecideRegistration`, `useTransferRegistrations`, `useUpdateSupervisionParticipation`.
Clients: `useClients` (`src/hooks/useData.ts`); participant-level unpaid ledger also in useData.ts.

## Pure logic
`src/lib/groupForm.ts` (form validation, finance aggregation, `uniqueConfirmedParticipants`) — tested in `groupForm.test.ts`.

## Database
- `groups` (settings, lifecycle/archive, publication, registration token/form/image) 
- `group_members` → clients; `group_sessions` → appointments; `group_attendance` → group_sessions/clients
- `group_session_payments` (per-participant state, feeds unpaid ledger & finance card)
- `group_registrations` (owner-only RLS; answer/question snapshots)
- RPCs: `public_get_group_registration`, `public_submit_group_registration(_v2)`, `decide_group_registration`, `transfer_group_registrations`, `backfill_group_expected_payments`, `is_published_group_image`
- Storage: private `group-form-images`, public read only for published active groups owned by uploader.

## Calendar integration
`CalendarPage.tsx` accepts `groupId` preselection; `SessionDetailSheet.tsx` shows group meetings. Not to be replaced.

## Permissions & localization
- Owner-scoped RLS everywhere; public access only via token RPCs.
- Text: `src/i18n/groupsExtra.ts`, `src/i18n/groupFormText.ts` + main dictionaries (uk/en/ru/pl/fr/de).
- Analytics: `src/lib/analytics.ts` (group_created/updated/deleted, registration view/submit/confirm/reject/waitlist).

## Reusable without modification
All hooks, RPCs, `groupForm.ts`, `GroupPublicationCard`, `GroupRegistrationsCard`, `GroupFormEditorCard`, `GroupFinanceCard`, `GroupSettingsFields`, `GroupMessageDialog`, public signup page, Calendar handoff.
Needs extraction only (no logic change): members section, meetings section, `AttendanceDialog` (currently inline in GroupDetailPage.tsx).
