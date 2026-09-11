// Shared content model for the public legal documents (Privacy, Terms, Cookies).
//
// The same structure is reused for every supported language so that no page
// can end up with mixed-language sections.

export type LegalBlock =
  | string
  | string[]
  | { type: "link"; to: string; label: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export type LegalSection = { h: string; body: LegalBlock[] };

export type LegalDoc = {
  back: string;
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
};

/** Release date of the current legal documents. Update on every material change. */
export const LEGAL_LAST_UPDATED = {
  en: "Last updated: September 11, 2026",
  uk: "Останнє оновлення: 11 вересня 2026 р.",
  pl: "Ostatnia aktualizacja: 11 września 2026 r.",
  fr: "Dernière mise à jour : 11 septembre 2026",
  ru: "Последнее обновление: 11 сентября 2026 г.",
} as const;

/** Version identifiers referenced by the documents themselves. */
export const LEGAL_VERSION = "2026-09-11";
