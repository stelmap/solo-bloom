# Settings architecture refactor

The current `SettingsPage` is a single ~850-line scroll containing profile, password, language, theme, sound, working hours, days off, taxes, currency, VAT, revenue recognition, payment methods, public booking, availability, and subscription.

We'll split it into three focused pages reachable from the sidebar and from contextual entry points inside Calendar and Finance, without changing any data model or breaking saved data.

## Target structure

```text
/settings              -> Account & system (lean, no scroll)
/calendar/settings     -> Calendar + booking configuration
/finance/settings      -> Finance configuration
```

### 1. `/settings` (Account)
Tabs (or short stacked cards, max one viewport tall per tab):
- **Profile** — full name, email (read-only), phone, language
- **Appearance** — theme, sound reminder
- **Security** — change password
- **Connected accounts** — existing `ConnectedAccountsSection`
- **Subscription** — existing `SubscriptionSection`

Remove from this page: working hours, days off, taxes, currency, VAT, revenue recognition, payment methods, public booking, availability, default session duration, business/invoice details.

### 2. `/calendar/settings` (new page, `AppLayout`)
Tabs:
- **Working hours** — weekly schedule + time format + default session duration
- **Days off** — vacation / holiday / sick days list + add dialog
- **Public booking** — full `PublicBookingSection` (link, slug, mode, timezone, availability rules: session length, buffer, min notice, max horizon, weekly availability)
- **Practice profile** — new card: display name (existing `booking_links.display_name`), business name, public description (reuses `profiles.business_name` + booking display name; logo placeholder, no upload yet)

Add a "Calendar settings" entry: header button on `/calendar` linking here, plus a sidebar sub-item under Calendar.

### 3. `/finance/settings` (new page, `AppLayout`)
Tabs:
- **Currency & invoicing** — currency, business_id, business_address, VAT mode + rate
- **Revenue recognition** — `income_recognition_method` radio (payment date / session date)
- **Payment methods** — existing `PaymentMethodsSection`
- **Taxes** — existing tax settings list + dialog
- **Analytics & break-even** — link out to existing `/breakeven` page (no logic move; break-even goals already live there)

Add "Finance settings" entry: header button on `/income` (or financial overview) and a sidebar sub-item.

## Sidebar

Add two sub-links under existing Calendar and Finance/Income groups in `AppSidebar`:
- Calendar → Settings
- Finance → Settings

Keep top-level "Settings" pointing to `/settings`.

## Implementation steps

1. Create `src/components/settings/` with extracted sub-components:
   - `ProfileCard.tsx`, `AppearanceCard.tsx`, `SecurityCard.tsx` (extracted from current SettingsPage)
   - `WorkingHoursCard.tsx`, `DaysOffCard.tsx` (extracted)
   - `CurrencyInvoiceCard.tsx`, `RevenueRecognitionCard.tsx`, `TaxSettingsCard.tsx` (extracted)
   - `PracticeProfileCard.tsx` (new, thin wrapper over profile + booking display name)
2. Rewrite `SettingsPage.tsx` to a tabbed Account page using shadcn `Tabs`.
3. Add `src/pages/CalendarSettingsPage.tsx` with tabs.
4. Add `src/pages/FinanceSettingsPage.tsx` with tabs.
5. Register routes in `src/App.tsx`: `/calendar/settings`, `/finance/settings`.
6. Add "Settings" entry buttons on `CalendarPage` header and `IncomePage`/`FinancialOverviewPage` header.
7. Add sub-nav items in `AppSidebar`.
8. Add new i18n keys for tab labels and section titles in `en.ts`, `uk.ts`, `fr.ts`, `pl.ts` (reusing existing keys where possible).

## Data / migration

No database changes. All existing fields stay on `profiles`, `booking_links`, `booking_availability`, `days_off`, `tax_settings`, `payment_methods`. Existing user data continues to load via the same hooks.

## Out of scope (kept as follow-up)
- Logo upload (placeholder only)
- Real domain-separated tables (`account_preferences`, `practice_profile`, …) — current `profiles` columns are sufficient; restructuring would require risky data migration. We'll document the logical grouping in code via the extracted card components.
