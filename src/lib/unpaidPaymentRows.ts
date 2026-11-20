type ExpectedDebt = {
  id: string;
  kind: string;
  amount: number;
  price?: number;
  client_id?: string | null;
  clients?: { name?: string | null } | null;
  appointments?: { scheduled_at?: string | null } | null;
};

/** Render debt rows from the same participant-level ledger as the summary. */
export function unpaidPaymentRows<T extends ExpectedDebt>(debts: T[]) {
  return debts.filter(debt => debt.kind !== 'opening' && Number(debt.amount) > 0).map(debt => {
    const remaining = Number(debt.amount);
    const price = Math.max(Number(debt.price ?? remaining), remaining);
    return { debt, price, paid: Math.round((price - remaining) * 100) / 100, remaining };
  });
}