export type PrepaidLedgerRow = {
  id: string;
  client_id: string;
  kind: "topup" | "use";
  sessions: number;
  amount: number;
  appointment_id: string | null;
  income_id: string | null;
  reversed_at: string | null;
  created_at: string;
};

export type PrepaidStatus = "none" | "ok" | "low" | "empty";

export type PrepaidSummary = { balance: number; hasTopups: boolean; status: PrepaidStatus };

/** 3+ sessions ok, 1–2 low, 0 after a real top-up empty; no top-up yet → none. */
export function prepaidStatus(balance: number, hasTopups: boolean): PrepaidStatus {
  if (!hasTopups) return "none";
  if (balance <= 0) return "empty";
  if (balance <= 2) return "low";
  return "ok";
}

export function summarizePrepaid(rows: PrepaidLedgerRow[]): Map<string, PrepaidSummary> {
  const acc = new Map<string, { balance: number; hasTopups: boolean }>();
  for (const r of rows) {
    if (r.reversed_at) continue;
    const cur = acc.get(r.client_id) ?? { balance: 0, hasTopups: false };
    if (r.kind === "topup") { cur.balance += r.sessions; cur.hasTopups = true; }
    else cur.balance -= r.sessions;
    acc.set(r.client_id, cur);
  }
  const out = new Map<string, PrepaidSummary>();
  acc.forEach((v, k) => out.set(k, { ...v, balance: Math.max(0, v.balance), status: prepaidStatus(v.balance, v.hasTopups) }));
  return out;
}

type L = "en" | "uk" | "ru" | "pl" | "fr";
const C: Record<L, Record<string, string>> = {
  en: { mode: "Works on prepayment", modeHint: "Sessions are deducted from paid sessions. Turning this on does not create a payment.", available: "Paid sessions left", low: "Prepayment running out", empty: "Prepayment used up", ok: "Prepayment active", none: "No prepayment yet", add: "Add prepayment", amount: "Amount", sessions: "Number of sessions", existing: "Existing payment (optional)", newPayment: "New payment", history: "Top-ups and deductions", topup: "Top-up", use: "Session deducted", reversed: "returned", save: "Save", completeBtn: "Complete, deduct from prepayment", noneLeft: "Paid sessions have run out. Add a prepayment in the client card.", left: "Paid sessions left: {n}", openClient: "Open client" },
  uk: { mode: "Працює за передоплатою", modeHint: "Заняття списуються з оплачених. Увімкнення не створює оплату.", available: "Доступно оплачених занять", low: "Передоплата закінчується", empty: "Передоплата закінчилася", ok: "Передоплата активна", none: "Передоплат ще немає", add: "Додати передоплату", amount: "Сума", sessions: "Кількість занять", existing: "Наявна оплата (необов’язково)", newPayment: "Нова оплата", history: "Поповнення та списання", topup: "Поповнення", use: "Списано заняття", reversed: "повернено", save: "Зберегти", completeBtn: "Завершити, списати з передоплати", noneLeft: "Оплачені заняття закінчилися. Додайте передоплату в картці клієнта.", left: "Залишилося оплачених занять: {n}", openClient: "Відкрити клієнта" },
  ru: { mode: "Работает по предоплате", modeHint: "Занятия списываются с оплаченных. Включение не создаёт оплату.", available: "Доступно оплаченных занятий", low: "Предоплата заканчивается", empty: "Предоплата закончилась", ok: "Предоплата активна", none: "Предоплат ещё нет", add: "Добавить предоплату", amount: "Сумма", sessions: "Количество занятий", existing: "Имеющаяся оплата (необязательно)", newPayment: "Новая оплата", history: "Пополнения и списания", topup: "Пополнение", use: "Списано занятие", reversed: "возвращено", save: "Сохранить", completeBtn: "Завершить, списать с предоплаты", noneLeft: "Оплаченные занятия закончились. Добавьте предоплату в карточке клиента.", left: "Осталось оплаченных занятий: {n}", openClient: "Открыть клиента" },
  pl: { mode: "Pracuje na przedpłatę", modeHint: "Sesje są odliczane z opłaconych. Włączenie nie tworzy płatności.", available: "Pozostało opłaconych sesji", low: "Przedpłata się kończy", empty: "Przedpłata się skończyła", ok: "Przedpłata aktywna", none: "Brak przedpłat", add: "Dodaj przedpłatę", amount: "Kwota", sessions: "Liczba sesji", existing: "Istniejąca płatność (opcjonalnie)", newPayment: "Nowa płatność", history: "Doładowania i odliczenia", topup: "Doładowanie", use: "Odliczono sesję", reversed: "zwrócono", save: "Zapisz", completeBtn: "Zakończ, odlicz z przedpłaty", noneLeft: "Opłacone sesje się skończyły. Dodaj przedpłatę w karcie klienta.", left: "Pozostało opłaconych sesji: {n}", openClient: "Otwórz klienta" },
  fr: { mode: "Travaille en prépaiement", modeHint: "Les séances sont déduites des séances payées. L’activation ne crée aucun paiement.", available: "Séances payées restantes", low: "Prépaiement bientôt épuisé", empty: "Prépaiement épuisé", ok: "Prépaiement actif", none: "Aucun prépaiement", add: "Ajouter un prépaiement", amount: "Montant", sessions: "Nombre de séances", existing: "Paiement existant (facultatif)", newPayment: "Nouveau paiement", history: "Recharges et déductions", topup: "Recharge", use: "Séance déduite", reversed: "rendue", save: "Enregistrer", completeBtn: "Terminer, déduire du prépaiement", noneLeft: "Les séances payées sont épuisées. Ajoutez un prépaiement dans la fiche client.", left: "Séances payées restantes : {n}", openClient: "Ouvrir le client" },
};
export const prepaidCopy = (lang: string) => C[(lang as L)] ?? C.en;
