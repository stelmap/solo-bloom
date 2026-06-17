// This file used to bundle all locales (~150KB). Locales are now split into
// src/i18n/locales/{en,uk,fr,pl}.ts and lazy-loaded by the LanguageContext.
// Only English is imported synchronously to keep types and provide a fallback.
import en from "./locales/en";

export type Language = "en" | "uk" | "fr" | "pl";
/** Extended runtime language set that also includes Russian. Local per-page
 *  Copy maps are still typed against `Language` (en/uk/fr/pl); when the user
 *  picks "ru" those pages render the English fallback while the main app
 *  dictionary serves Russian via translateFor(). */
export type AppLanguage = Language | "ru";
export type TranslationDict = Record<string, string>;
// Kept as `string` (not `keyof typeof en`) to preserve historical behaviour:
// callers may reference keys that don't yet have a translation entry, and
// `translateFor` falls back gracefully.
export type TranslationKey = string;

export const englishDict: Readonly<Record<string, string>> = en;

/** Map of loaded language dictionaries. EN is always loaded; others arrive async. */
const loaded: Partial<Record<AppLanguage, Readonly<Record<string, string>>>> = { en };

const loaders: Record<AppLanguage, () => Promise<{ default: Record<string, string> }>> = {
  en: () => Promise.resolve({ default: en }),
  uk: () => import("./locales/uk"),
  fr: () => import("./locales/fr"),
  pl: () => import("./locales/pl"),
  ru: () => import("./locales/ru"),
};

/** Synchronously read a loaded dict, or fall back to English if not yet loaded. */
export function getDict(lang: AppLanguage): Readonly<Record<string, string>> {
  return loaded[lang] ?? en;
}

/** Lazy-load a locale. Resolves once the dict is available. */
export async function loadLocale(lang: AppLanguage): Promise<Readonly<Record<string, string>>> {
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
