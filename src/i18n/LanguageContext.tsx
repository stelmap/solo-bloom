import { createContext, useContext, ReactNode, useCallback, useEffect } from "react";
import { translations, Language, TranslationKey } from "./translations";
import { useProfile } from "@/hooks/useData";

const LANG_STORAGE_KEY = "app_lang";

interface LanguageContextType {
  lang: Language;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  setLang: (lang: Language) => void;
}

/** Translate a key for a specific language (standalone, no hook needed) */
export function translateFor(
  lang: Language,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const entry = translations[key];
  if (!entry) {
    // Fallback: extract readable label from key (e.g. "nav.dashboard" → "Dashboard")
    const fallback = key.includes(".") ? key.split(".").pop() ?? key : key;
    return fallback.charAt(0).toUpperCase() + fallback.slice(1).replace(/([A-Z])/g, " $1");
  }
  let text: string = entry[lang] || entry.en;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

/** Read the language stored in localStorage (used before profile loads) */
export function getStoredLang(): Language {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY) || localStorage.getItem("landing_lang");
    if (stored === "uk") return "uk";
  } catch {}
  return "en";
}

/** Persist language choice to localStorage */
export function setStoredLang(lang: Language) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    localStorage.setItem("landing_lang", lang); // keep landing page in sync
  } catch {}
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  t: (key) => translateFor("en", key),
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();

  // Priority: profile language > localStorage > "en"
  const profileLang = profile?.language as Language | undefined;
  const lang: Language = profileLang || getStoredLang();

  // Keep localStorage in sync when profile language changes
  useEffect(() => {
    if (profileLang) {
      setStoredLang(profileLang);
    }
  }, [profileLang]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string =>
      translateFor(lang, key, params),
    [lang]
  );

  const setLang = useCallback((newLang: Language) => {
    setStoredLang(newLang);
    // Force re-render by reloading — since lang is derived from profile or storage
    window.location.reload();
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
