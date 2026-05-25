## Часткова оплата сесії + автоматичне закриття боргів

Розширюємо існуючу логіку передоплат правилом часткової оплати та FIFO‑розподілом нових оплат: спершу борги → потім поточна сесія → потім передоплата.

### 1. База даних

**Міграція** додає одну SQL‑функцію та необхідні статуси:

- Розширюємо допустимі значення `appointments.payment_status` так, щоб приймали `partially_paid`.
- Нова RPC `apply_payment_to_client_debts(p_user_id, p_client_id, p_income_id, p_amount)`:
  1. Бере `expected_payments` клієнта зі статусом `pending` у порядку `created_at` ASC.
  2. Для кожного: списує з `p_amount`, оновлює `amount` (або позначає `paid` коли = 0), створює рядок в `income_session_allocations` (`income_id`, `appointment_id`, `allocated_amount`, `from_prepayment=false`).
  3. Коли борг закрито повністю → відповідний `appointment.payment_status` стає `paid`; коли частково — `partially_paid`, а `expected_payments.amount` зменшується.
  4. Повертає залишок (`leftover`) — суму, яка не пішла на борги.

### 2. Хуки (`src/hooks/useData.ts`)

**`useCompleteAppointment`** переписуємо під єдиний потік `paid_now / paid_in_advance`:

- `amountPaid` тепер може бути `< price` (часткова оплата), `=` (повна), або `>` (передоплата).
- Кроки:
  1. `appointment.update({ status: completed, price, payment_status })` де `payment_status` обчислюється:
     - `paid` якщо після всіх розподілів сесія покрита,
     - `partially_paid` якщо залишилась частина боргу,
     - `waiting_for_payment` якщо `amountPaid = 0` (вибрано "очікую оплату").
  2. Якщо `amountPaid > 0`: створюємо `income` на `amountPaid`.
  3. Викликаємо нову RPC `apply_payment_to_client_debts` — закриваємо старі борги клієнта; отримуємо `leftover`.
  4. З `leftover` покриваємо поточну сесію: створюємо `income_session_allocations` (поточна сесія, `min(leftover, price)`).
  5. Якщо `leftover < price` — створюємо `expected_payments` на залишок (`price - leftover`) і ставимо `payment_status = partially_paid`.
  6. Якщо `leftover > price` — різниця йде в `client_credits` як передоплата.
- Логіка `paid_from_prepayment` залишається як є (вже працює FIFO через `consume_client_credit_for_appointment`).

**`useAddIncome` / `useUpdateIncome`** (ручний дохід): якщо `client_id` встановлено і `appointment_id` НЕ встановлено — після створення income автоматично викликаємо `apply_payment_to_client_debts`, а решту відправляємо в `client_credits` (як уже частково реалізовано).

### 3. UI — `SessionDetailSheet.tsx`

- Прибираємо `min={completePrice}` з поля "Amount received" і `if (amountPaid < v) setAmountPaid(v)`.
- Додаємо нову плашку‑підказку у режимі завершення:
  - `amountPaid < price` → "Часткова оплата: <X> в дохід, <Y> у заборгованість, статус → Частково оплачено".
  - `amountPaid = price` → "Повна оплата: <X> в дохід".
  - `amountPaid > price` → існуюча плашка передоплати.
- Якщо у клієнта є відкриті борги — показуємо інфо‑блок "Буде закрито X € старих боргів цього клієнта".

### 4. Картка клієнта (`ClientDetailPage.tsx`)

- Додаємо блок "Заборгованість": сума всіх `expected_payments` (status='pending') клієнта + список сесій з датою і сумою боргу.

### 5. Локалізація

Додаємо ключі в `en/uk/fr/pl`:
- `payment.partiallyPaid`, `payment.expectedPayment`
- `prepayment.partialPayment`, `prepayment.willCreateDebt`
- `prepayment.willCloseDebts`
- `client.outstandingDebt`, `client.debtFromSession`
- `toast.partialPaymentRecorded`

### 6. Аналітика (cash flow)

Перевіряємо `Dashboard.tsx`, `FinancialOverviewPage.tsx`, `ClientDetailPage.tsx`:
- `expected_payments` НЕ враховуються в `cash_income` (вже так).
- `PAID_STATUSES` додаємо `partially_paid`? — ні, partially_paid не є "повністю оплаченим"; income table вже відображає реально отримані гроші, тож аналітика лишається коректною.

### Out of scope

- Окрема UI‑форма для ручного "погашення боргу" — вистачає того, що будь‑яка нова оплата з `client_id` автоматично закриває борги FIFO.
- Часткове відкочування (refund).
- Перепризначення вже створених `income_session_allocations` вручну.

### Acceptance Criteria mapping
- AC1 ✓ — крок 2.5 у `useCompleteAppointment`.
- AC2 ✓ — `expected_payments` не пишеться в `income` table.
- AC3 ✓ — FIFO RPC закриває старі борги до поточної сесії, далі — передоплата.
- AC4 ✓ — RPC оновлює `appointment.payment_status` на `paid` при повному закритті.
- AC5 ✓ — блок "Заборгованість" у картці клієнта.