# Calendar Visual Configuration & Booking Inbox Integration

This is a large feature touching the Calendar page heavily. I'll deliver it in one coordinated edit to `src/pages/CalendarPage.tsx` plus 2 small new files. No backend schema changes — the data already supports it (appointments, `session_booking_requests`, urgency, status).

## What I'll build

### 1. View switcher (Day / Week / Month)
- Segmented control next to date navigation, default = Week.
- New Month grid renderer (compact cells with per-day session count + dots by type).
- Day view = current single-day mobile layout reused on desktop.
- State persisted in `localStorage` (`calendar.view`).

### 2. Session card visual system
Unified `SessionCard` with:
- Color by **primary type**: Individual = neutral gray, Group = green, Pair = purple.
- **Status marker** strip: Rescheduled (amber), Cancelled (muted/strikethrough), Completed (check), No-show (gray-dashed), Confirmed (default).
- **Urgent** = red left border + red dot (works on top of any type/status).
- **New** = red "NEW" pill + red dot, auto-clears 24h after `created_at` or when the user opens the session (stored in `localStorage` as `calendar.seen:<id>`).
- **Pending request** slots = dashed orange border, "Pending" label, blocks the slot visually.
- Cards composable: e.g. Individual + Urgent + New all render together without conflict.

### 3. Filters bar
Replace existing FILTER row with a richer toolbar:
- Type chips: All / Individual / Group / Pair
- Status dropdown: Confirmed / Pending / Rescheduled / Cancelled / Completed / No-show
- Flag chips: Urgent only, New only
- Client/group search input (debounced)
- "Clear filters" button (appears when any filter active)
- All client-side, no reload.

### 4. Calendar legend
Collapsible legend strip below the calendar grid showing every color/marker with its label. Toggleable via settings.

### 5. Pending request slots → Booking Inbox drawer (no separate page)
- Clicking a pending slot opens a right-side **Sheet** (`BookingInboxPanel` reused inline) instead of navigating to `/booking-inbox`.
- Existing top "Booking inbox: N new" banner becomes a button that opens the same drawer.
- Drawer lists requests with Accept / Decline / Full request actions (already implemented in `BookingInboxPanel`, wired to the existing `useConfirmBookingRequest` / `useDeclineBookingRequest` hooks).
- "Full request" expands the row inline inside the drawer (no extra modal page).

### 6. Weekly workload block
Add 3 new counters next to existing Total / Booked / Free:
- Pending requests
- Urgent sessions (this week)
- Rescheduled sessions (this week)
Pending requests stay separate from Booked.

### 7. Calendar settings (gear icon)
Existing gear already opens a settings sheet — I'll add a new "Display" section with toggles:
- Show colors / labels / urgent / new / rescheduled markers
- Default view (Day / Week / Month)
- Card density (compact / comfortable / detailed)
All stored in `localStorage` under `calendar.display.*` and applied live.

### 8. New session highlight
After `createAppointment` success, the new appointment id is stored in a `Set` (`localStorage` `calendar.newIds`) with timestamp; the card renders the NEW marker until opened or 24h elapsed.

## Technical notes
- New helper: `src/lib/calendarVisuals.ts` — pure functions: `typeColor(apt)`, `statusMarker(apt)`, `isUrgent(apt)`, `isNew(apt)`, `markSeen(id)`.
- New hook: `src/hooks/useCalendarDisplay.ts` — reads/writes display prefs to localStorage, exposes `{ view, setView, density, flags, ... }`.
- `CalendarPage.tsx`: refactored to consume the hook; new MonthView component inlined.
- Reuses existing `BookingInboxPanel`, `useBookingRequests`, `useConfirmBookingRequest`, `useDeclineBookingRequest`.
- No database migration needed.

## Out of scope (per spec)
- Separate Booking Inbox page (kept as redirect for now; nothing removed).
- Telegram, payments, billing, public booking redesign.

## Acceptance checklist
All AC1–AC10 covered by the above.
