// This file used to bundle all locales (~150KB). Locales are now split into
// src/i18n/locales/{en,uk,fr,pl}.ts and lazy-loaded by the LanguageContext.
// Only English is imported synchronously to keep types and provide a fallback.
import en from "./locales/en";

export type Language = "en" | "uk" | "fr" | "pl";
export type TranslationDict = Record<string, string>;
export type TranslationKey = keyof typeof en;

export const englishDict: Readonly<Record<string, string>> = en;

/** Map of loaded language dictionaries. EN is always loaded; others arrive async. */
const loaded: Partial<Record<Language, Readonly<Record<string, string>>>> = { en };

const loaders: Record<Language, () => Promise<{ default: Record<string, string> }>> = {
  en: () => Promise.resolve({ default: en }),
  uk: () => import("./locales/uk"),
  fr: () => import("./locales/fr"),
  pl: () => import("./locales/pl"),
};

/** Synchronously read a loaded dict, or fall back to English if not yet loaded. */
export function getDict(lang: Language): Readonly<Record<string, string>> {
  return loaded[lang] ?? en;
}

/** Lazy-load a locale. Resolves once the dict is available. */
export async function loadLocale(lang: Language): Promise<Readonly<Record<string, string>>> {
  const cached = loaded[lang];
  if (cached) return cached;
  const mod = await loaders[lang]();
  loaded[lang] = mod.default;
  return mod.default;
}

/**
 * Back-compat shim: legacy callers used `translations[key][lang]`.
 * We expose a Proxy that returns `{ en, uk, fr, pl }` for any key, reading
 * from whatever dicts are currently loaded (falling back to EN).
 */
export const translations = new Proxy(
  {} as Record<string, { en: string; uk: string; fr: string; pl: string }>,
  {
    get(_t, key: string) {
      const fallback = en[key as TranslationKey] ?? key;
      return {
        en: fallback,
        uk: getDict("uk")[key] ?? fallback,
        fr: getDict("fr")[key] ?? fallback,
        pl: getDict("pl")[key] ?? fallback,
      };
    },
  },
);
