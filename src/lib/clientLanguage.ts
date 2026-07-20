/**
 * Client communication language — single source of truth.
 * The authoritative value lives in clients.communication_language.
 * Never derive from browser, therapist interface, or country.
 */

export type ClientLanguage = "uk" | "ru" | "en" | "pl";

export const CLIENT_LANGUAGES: ClientLanguage[] = ["uk", "ru", "en", "pl"];

export const CLIENT_LANGUAGE_MISSING = "CLIENT_LANGUAGE_MISSING" as const;

export function isSupportedClientLanguage(v: unknown): v is ClientLanguage {
  return typeof v === "string" && (CLIENT_LANGUAGES as string[]).includes(v);
}

/**
 * Resolve the language to use for any client-facing communication.
 * Throws CLIENT_LANGUAGE_MISSING when the client has no language set —
 * callers must block sending and prompt the therapist to open the client card.
 */
export function resolveClientCommunicationLanguage(
  client: { communication_language?: string | null } | null | undefined
): ClientLanguage {
  const v = client?.communication_language;
  if (!isSupportedClientLanguage(v)) {
    throw new Error(CLIENT_LANGUAGE_MISSING);
  }
  return v;
}

/** Localized display name for a client-language code, in the therapist UI language. */
export function clientLanguageLabel(
  code: ClientLanguage,
  uiLang: string
): string {
  const table: Record<string, Record<ClientLanguage, string>> = {
    uk: { uk: "Українська", ru: "Російська", en: "Англійська", pl: "Польська" },
    ru: { uk: "Украинский", ru: "Русский", en: "Английский", pl: "Польский" },
    en: { uk: "Ukrainian", ru: "Russian", en: "English", pl: "Polish" },
    pl: { uk: "Ukraiński", ru: "Rosyjski", en: "Angielski", pl: "Polski" },
    fr: { uk: "Ukrainien", ru: "Russe", en: "Anglais", pl: "Polonais" },
  };
  return (table[uiLang] ?? table.en)[code];
}

/** BCP-47 locale mapping for date/number formatting. */
export function localeForClientLanguage(code: ClientLanguage): string {
  return { uk: "uk-UA", ru: "ru", en: "en-GB", pl: "pl-PL" }[code];
}
