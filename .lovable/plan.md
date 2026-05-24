# Plan: Public Booking Link + Client Document Workflow

Це великий milestone з public-facing шаром. Пропоную розбити на 2 незалежні фази, які можна релізити окремо. Лендинг не чіпаємо.

---

## Phase 1 — Public Booking Link (MVP)

### Backend (міграції)

**Нові таблиці:**

- `booking_links` — одне посилання на користувача
  - `user_id`, `token` (унікальний, 32 байти hex), `is_active`, `mode` ('manual' | 'auto'), `created_at`
  - RLS: власник CRUD; публічний `SELECT` по `token` (через SECURITY DEFINER RPC, не напряму)

- `booking_availability` — правила доступності
  - `user_id`, `weekday` (0-6), `start_time`, `end_time`
  - `session_duration_minutes`, `buffer_minutes`, `min_notice_hours`, `max_horizon_days`
  - (для MVP — один набір правил на користувача, не per-service)

- `booking_requests` (перейменувати існуючу `booking_requests` лендингу → `landing_booking_requests`, або створити нову `session_booking_requests` щоб не плутати)
  - **Пропоную: `session_booking_requests`** (нова таблиця, існуючу booking_requests лендингу не чіпаємо)
  - `user_id`, `appointment_id` (nullable), `client_id` (nullable), `link_id`
  - `first_name`, `last_name`, `email`, `phone`, `comment`, `consent_at`
  - `requested_slot_at`, `status` ('pending' | 'confirmed' | 'cancelled_client' | 'cancelled_therapist' | 'needs_linking' | 'spam' | 'expired')
  - `ip_hash`, `created_at`

**SECURITY DEFINER RPC функції** (єдиний публічний доступ):
- `public_get_booking_page(p_token)` → повертає тільки `{therapist_display_name, session_duration, currency_lang}` (без приватних даних)
- `public_get_available_slots(p_token, p_from_date, p_to_date)` → масив вільних слотів, обчислений на сервері з урахуванням `appointments`, `days_off`, `booking_availability`
- `public_create_booking(p_token, p_slot_at, p_first_name, p_last_name, p_email, p_phone, p_comment, p_consent)` → з input-валідацією, перевіркою конфлікту слоту (FOR UPDATE), rate-limit за IP-хешем (макс N за годину), створює `session_booking_requests` row + якщо `mode='auto'` — створює `appointments` row

**Логіка matching** (виконується в RPC або triggered): шукає client за email → phone → name; ставить `status='pending'` з підказкою або `needs_linking`.

### Frontend

**Нові сторінки:**
- `/book/:token` — публічна сторінка (поза `AppLayout`, без auth)
  - Крок 1: вибір дати + слоту
  - Крок 2: форма (ім'я, email, телефон, коментар, consent)
  - Крок 3: success / "очікує підтвердження"
  - SEO: `<meta name="robots" content="noindex,nofollow">`
  - i18n: uk/en/fr/pl

**Settings (Calendar Settings):**
- Нова секція "Public Booking" в `SettingsPage`:
  - Toggle enable/disable
  - Copy link / Regenerate (з confirm dialog)
  - Mode: manual / auto-confirm
  - Availability form (дні тижня, години, тривалість, buffer, min notice, max horizon)

**Calendar:**
- Бейдж "Public booking" на сесіях з `source = public_link`
- Бейдж "Needs client linking" жовтим
- В `SessionDetailSheet` — нова дія "Attach to client" / "Create new client from booking" / "Mark as spam"

**Inbox/Requests:**
- В сайдбарі — новий пункт "Booking requests" (badge з кількістю pending)
- Сторінка `BookingRequestsPage` — список запитів, дії Approve / Reject / Link to client

### Email
- `booking-request-notification-therapist` (новий шаблон) — психотерапевту про нову заявку
- `booking-confirmation-client` (новий шаблон) — клієнту: "отримано / підтверджено"
- Використовуємо існуючу `send-transactional-email` інфраструктуру

### Security
- Token: 32 байти, `encode(gen_random_bytes(32), 'hex')`
- Rate limit: per IP-hash в RPC (відмова якщо >5 спроб/година)
- Validation: zod на клієнті + CHECK constraints + RPC валідація
- Consent обов'язковий — без нього RPC падає
- Анти-спам: honeypot поле + перевірка email-формату

---

## Phase 2 — Client Document Workflow (MVP)

### Backend

**Нові таблиці:**

- `document_templates`
  - `user_id`, `name`, `category` ('onboarding' | 'legal' | 'process' | 'payment' | 'supervision' | 'custom')
  - `type` ('form' | 'pdf' | 'text' | 'consent')
  - `content_jsonb` (для form fields) або `file_path` (для PDF з storage)
  - `requires_signature` boolean

- `document_sends`
  - `user_id`, `client_id`, `template_id`, `appointment_id` (nullable)
  - `token` (унікальний secure), `expires_at`, `deadline_at` (nullable)
  - `status` ('draft'|'sent'|'opened'|'in_progress'|'submitted'|'overdue'|'cancelled'|'expired'|'archived')
  - `sent_at`, `opened_at`, `submitted_at`
  - `response_jsonb` (заповнені поля), `file_path` (для submitted PDF)
  - `message` text (від терапевта)

- `document_audit`
  - `document_send_id`, `event` ('created'|'sent'|'opened'|'submitted'|'viewed'|'archived'|'deleted')
  - `actor_type` ('therapist'|'client'|'system'), `created_at`, `ip_hash`

**Storage bucket:** `client-documents` (private, RLS — тільки власник)

**SECURITY DEFINER RPC:**
- `public_get_document(p_token)` → перевіряє expires_at, ставить `opened_at`, повертає шаблон + чернетку
- `public_submit_document(p_token, p_response, p_consent)` → зберігає, ставить status='submitted'
- Email верифікація: для MVP достатньо token-only (як зазначено в специфікації)

### Frontend

**Settings:**
- Нова сторінка `/settings/document-templates` — CRUD шаблонів з form builder (drag/drop полів: short text, long text, date, checkbox, radio, dropdown, email, phone, signature)

**Client Profile (`ClientDetailPage`):**
- Нова таб "Documents":
  - Список sent / submitted / pending
  - Кнопка "Send document" → dialog з вибором template, deadline, message
  - Для submitted — preview відповіді + download PDF

**Client Creation:**
- Чекбокс "Send onboarding documents" + multi-select шаблонів категорії onboarding

**Session Details:**
- Дія "Send document from this session"

**Public сторінка:**
- `/doc/:token` — поза auth
  - Renderер форми залежно від типу
  - Save draft / Submit
  - Success screen
  - noindex

### Email
- `document-sent-to-client` — клієнту з secure link
- `document-submitted-notification` — терапевту про заповнення
- `document-overdue-reminder` — клієнту якщо deadline minus 1 день (cron, можна Phase 3)

### Security
- Token: 32 байти hex
- `expires_at` default 30 днів
- noindex meta
- RLS: storage policy перевіряє `user_id` власника
- Consent перед submit

---

## Що НЕ робимо в цьому milestone
- Оплата при бронюванні
- Кабінет клієнта
- Per-service availability (один загальний набір)
- Кілька публічних посилань
- Групові бронювання
- Юридично сертифікований e-signature
- Document versioning
- Спільний доступ між спеціалістами
- Інтеграція з Google Calendar (slot calculation поки тільки з SoloBizz appointments + days_off)

---

## Технічні деталі

**Стек:** існуючий React 18 + Vite + Supabase. Жодних нових бібліотек крім, можливо, простого form-builder UI (можна на shadcn).

**Routing:** `/book/:token` та `/doc/:token` додати в `App.tsx` поза `ProtectedRoute` і поза `AppLayout`.

**i18n:** додати ключі в `src/i18n/locales/{en,uk,fr,pl}.ts`.

**Тести:** unit для slot-calculation, e2e (Playwright) для booking flow та document submit.

**Rollout:** feature flag `public_booking_enabled` (вже є `useFeatureFlag`), щоб релізити поступово.

---

## Орієнтовний обсяг
- Phase 1: ~12-15 файлів, 2 міграції, 3 RPC, 4 нових сторінки/секції
- Phase 2: ~10-12 файлів, 2 міграції, 2 RPC, 1 storage bucket

**Рекомендую почати з Phase 1**, бо вона дає більшу цінність і не залежить від Phase 2. Якщо погоджуєш — приступаю до Phase 1 з міграціями.
