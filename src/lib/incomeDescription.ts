/** Localizes system-generated English income descriptions (stored in DB) at render time. */
const RE = /^(Backfilled: )?([\d.,]+) deducted from prepayment balance for session on ([^.]+?\d)\.(?: Balance before: ([\d.,-]+)\. Balance after: ([\d.,-]+)\.)?$/;

const T: Record<string, (a: string, d: string, b?: string, c?: string) => string> = {
  uk: (a, d, b, c) => `${a} списано з передоплати за сесію ${d}.` + (b ? ` Баланс до: ${b}. Баланс після: ${c}.` : ""),
  ru: (a, d, b, c) => `${a} списано с предоплаты за сессию ${d}.` + (b ? ` Баланс до: ${b}. Баланс после: ${c}.` : ""),
  pl: (a, d, b, c) => `${a} pobrano z przedpłaty za sesję ${d}.` + (b ? ` Saldo przed: ${b}. Saldo po: ${c}.` : ""),
  fr: (a, d, b, c) => `${a} déduit de l'acompte pour la séance du ${d}.` + (b ? ` Solde avant : ${b}. Solde après : ${c}.` : ""),
};

export function isPrepaymentDeduction(desc?: string | null): boolean {
  return !!desc && RE.test(desc.trim());
}

export function localizeIncomeDescription(desc: string | null | undefined, lang: string): string {
  if (!desc) return "";
  const m = desc.trim().match(RE);
  const fn = T[lang];
  if (!m || !fn) return desc;
  return fn(m[2], m[3], m[4], m[5]);
}
