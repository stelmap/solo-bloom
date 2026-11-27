# Groups corrections — 27 November 2026

Changes remain preview-only. No schema, permission, payment calculation or approval RPC changes.

## Root causes and implementation
- **Calendar:** Overview classified by start time only; appointment mutations and live updates missed `group-sessions`. Reads lacked pagination. Calendar used the reverse FK while Overview used the canonical unique appointment FK; 2,856 legacy rows lacked reverse links. Added canonical read fallback, checked/idempotent link creation, complete reads, refresh invalidations, end-time classification, practice-clock Today and 15-second clock updates. Group recurring edits no longer cascade-delete links/history; ordinary edits skip unnecessary regeneration. Open Calendar details now render refreshed appointment data.
- **Applications:** `max-w-4xl` plus the layout's own maximum width restricted the workspace; filters lived in the list; answers omitted empty values and false checkboxes. Group Details opts into 24px full-width content without changing other pages/sidebar. Filters span the workspace; 35/65 columns, list-local search/sort, complete wrapping snapshot answers and localized missing/boolean values. Existing approval and transfer actions retained.
- **Description:** Existing `registration_form.intro` was plain text. Reused Tiptap editor, added opt-in undo/redo/clear buttons and safe shared description conversion; saved HTML stays in the existing JSON. Legacy line breaks remain readable. Published and preview views use the same sanitizer and formatting classes.
- **Preview:** Existing button required publication and opened the public URL. Permanent owner preview fetches saved owner-scoped configuration, uses the actual public form with disabled submission and an early-return handler, no public fetch/events, visible mode/return button. Unsaved changes offer save-and-preview or saved-version preview. Save does not publish.

## Modified files
`src/components/{AppLayout,RichTextEditor}.tsx`; `src/components/groups/{GroupExtras,GroupFormEditor,GroupMeetingsSection}.tsx`; `src/pages/{CalendarPage,GroupDetailPage,PublicGroupSignupPage}.tsx`; `src/hooks/{useData,useGroups,usePracticeLiveUpdates}.ts`; `src/lib/{groupMeetings,groupSessionSync,groupDescription}.ts` and tests; `src/pages/PublicGroupSignupPage.test.tsx`; `src/i18n/groupCorrectionsText.ts`; `AGENTS.md`, `roadmap.md`, Groups progress/verification docs.

## Executed automated checks
- 46 tests passed across nine files: group meetings, canonical links, application filtering/status/actions, rich-description sanitization, form configuration/finances, signup validation, participant pricing, preview isolation and Calendar synchronization.
- Harness TypeScript validation and preview build: OK. No manual build was run.
- Preview test directly submits the form event despite the disabled button: no RPC or public analytics call occurs. Sanitizer test removes scripts, executable attributes and javascript links.

## Browser evidence and acceptance results
Real signed-in isolated test account; no production customer records edited. Decision-email checkbox explicitly disabled; no emails or incoming payments generated.

| Area | Observed result |
|---|---|
| Meetings | Created group through UI; Group Add meeting opened Calendar with group selected; selected service/time and saved. Both FKs read back consistently. Later-today meeting displayed Today in Overview. Rescheduled using Calendar edit; open details and Overview updated without reload. Completed via waiting-for-payment; meeting moved to History without reload. |
| Pricing | Existing €30 participant override charged €30 against a €45 meeting; no historical charges recalculated. |
| Applications | Public submission appeared as New; full multiline 1,100+ character answer and empty optional answer visible. Search by email and no-results verified. New-client confirmation created linked client/member; existing-client confirmation reused exact ID without duplicate; archived client reactivated. Two selected applications transferred via existing dialog and appeared in destination. |
| Layout | 1280, 1440, 1920, 2560px: five filters share one row; list/detail side by side with wider details. 768/390px: no horizontal page overflow; mobile filter wrapping and list/detail navigation verified. |
| Description | Bold persisted after Save/reload/reopen, rendered on published form. Heading, hyperlink, bulleted list and undo/redo exercised through toolbar and rendered in saved preview. |
| Preview | Unpublished, published and subsequently unpublished previews opened; latest saved title shown instead of unsaved edit. Dropdown/checkbox/URL fields interactive; registration disabled. Anonymous public URL unavailable and direct unpublished group read returned no rows. |
| Language | Owner preview/mode/return/optional/submit checked in Ukrainian, English and Polish; all new strings also supplied in German, French and Russian. Custom owner-written labels remain unchanged. |
| Runtime | No page errors in completed form, Applications or extended regression scripts. |

## Not fully verified / remaining issues
- Recurrence-pattern changes, explicit creation starting from Calendar rather than the Group handoff, live in-progress transition and cancellation not exercised end-to-end; in-progress/completed/time-boundary logic is unit-tested. Cross-tab realtime delivery not independently verified.
- Cover-image preview not exercised in this package (existing signed-image hook reused). Italic/underline/strike/numbered-list/clear-format toolbar actions not individually browser-tested.
- Historical owner groups were not modified; legacy-link fallback unit-tested and deployed links inspected read-only. Full REG-01–20 is therefore partial, not an all-pass claim.
- Existing transfer RPC does not copy custom answer snapshots to destination applications; originals remain on the source. Kept unchanged to preserve requested transfer behavior.
- Client-side multi-write creation is retry-safe but not an atomic transaction; network failure can still leave a partially linked appointment requiring retry. No new database transaction introduced.
- Public meeting list still uses its existing RPC filtering; this package changes Calendar/Group Overview classification, not that RPC.
- Refunds, anonymous decision emails, file materials and unrelated language-select gaps remain outside scope.

Screenshots supplied separately: desktop Applications, unpublished rich preview and completed meeting History.