import type { AppLanguage } from "@/i18n/translations";

export const invoiceRegisterCopy: Record<AppLanguage, { registers: string; title: string; search: string; empty: string; meeting: string; noMeeting: string; view: string; print: string }> = {
  uk: { registers: "Рахунки", title: "Рахунки", search: "Номер або клієнт", empty: "Рахунків поки немає", meeting: "Зустріч", noMeeting: "Без зустрічі", view: "Переглянути", print: "Друк" },
  en: { registers: "Invoices", title: "Invoices", search: "Number or client", empty: "No invoices yet", meeting: "Meeting", noMeeting: "No meeting", view: "View", print: "Print" },
  ru: { registers: "Счета", title: "Счета", search: "Номер или клиент", empty: "Счетов пока нет", meeting: "Встреча", noMeeting: "Без встречи", view: "Просмотреть", print: "Печать" },
  pl: { registers: "Faktury", title: "Faktury", search: "Numer lub klient", empty: "Brak faktur", meeting: "Spotkanie", noMeeting: "Bez spotkania", view: "Podgląd", print: "Drukuj" },
  fr: { registers: "Factures", title: "Factures", search: "Numéro ou client", empty: "Aucune facture", meeting: "Rendez-vous", noMeeting: "Sans rendez-vous", view: "Afficher", print: "Imprimer" },
};

export function filterInvoiceRegister<T extends { invoice_number: string; client_name: string; invoice_date: string }>(rows: T[], search: string, from: string, to: string): T[] {
  const query = search.trim().toLocaleLowerCase();
  return rows.filter(row => (!query || `${row.invoice_number} ${row.client_name}`.toLocaleLowerCase().includes(query)) && (!from || row.invoice_date >= from) && (!to || row.invoice_date <= to));
}