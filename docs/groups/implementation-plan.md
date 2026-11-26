# Groups — Implementation Plan (5 tabs)

Principle: relocate/reuse first, add new only where needed.

| # | Package | Depends on | Content |
|---|---|---|---|
| GRP-01 | Extract inline sections | — | Move members, meetings, AttendanceDialog out of GroupDetailPage.tsx into components/groups/* unchanged |
| GRP-02 | Tab shell | 01 | Tabs with URL-persisted active tab (`?tab=`), localized labels in 6 languages |
| GRP-03 | Overview tab | 02 | Header actions, settings summary, Publication card, meetings + Add meeting, Finance card |
| GRP-04 | Applications tab | 02 | GroupRegistrationsCard (+ status counts/filter if required) |
| GRP-05 | Participants tab | 01,02 | Members, per-member price, attendance, message dialog |
| GRP-06 | Form Configuration tab | 02 | GroupFormEditorCard as-is |
| GRP-07 | Analytics tab (new) | 02 | Derived from existing data: applications funnel, attendance rate, finance; no new tables unless spec demands |
| GRP-08 | QA | all | Tests for new pure metrics, browser check with test group |
