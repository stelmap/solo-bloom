import { createContext, useContext, ReactNode, useCallback, useEffect, useState } from "react";
import { translations, Language, TranslationKey } from "./translations";
import { useProfile, useUpdateProfile } from "@/hooks/useData";

const LANG_STORAGE_KEY = "app_lang";
const PRE_LOGIN_LANG_KEY = "pre_login_lang";
const LANG_CHANGE_EVENT = "app_lang_change";

function normalizeLang(value: string | null | undefined): Language | null {
  if (value === "uk" || value === "fr" || value === "en") return value;
  return null;
}

function getBrowserLang(): Language {
  try {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("uk")) return "uk";
    if (browserLang.startsWith("fr")) return "fr";
  } catch {}
  return "en";
}

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
    const stored = normalizeLang(localStorage.getItem(LANG_STORAGE_KEY) || localStorage.getItem("landing_lang"));
    if (stored) return stored;
  } catch {}
  return getBrowserLang();
}

export function getPreLoginLang(): Language | null {
  try {
    return normalizeLang(localStorage.getItem(PRE_LOGIN_LANG_KEY));
  } catch {}
  return null;
}

/** Persist language choice to localStorage */
export function setStoredLang(lang: Language) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    localStorage.setItem("landing_lang", lang); // keep landing page in sync
    window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: lang }));
  } catch {}
}

/** Persist the explicit language chosen before authentication. */
export function setPreLoginLang(lang: Language) {
  try {
    localStorage.setItem(PRE_LOGIN_LANG_KEY, lang);
  } catch {}
  setStoredLang(lang);
}

export function clearPreLoginLang() {
  try {
    localStorage.removeItem(PRE_LOGIN_LANG_KEY);
  } catch {}
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  t: (key) => translateFor("en", key),
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [storedLang, setStoredLangState] = useState<Language>(() => getStoredLang());
  const [preLoginLang, setPreLoginLangState] = useState<Language | null>(() => getPreLoginLang());

  // Listen for in-app language changes (e.g. from landing page toggle)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Language>).detail;
      if (detail) {
        setStoredLangState(detail);
        setPreLoginLangState(getPreLoginLang());
      }
    };
    const storageHandler = () => {
      setStoredLangState(getStoredLang());
      setPreLoginLangState(getPreLoginLang());
    };
    window.addEventListener(LANG_CHANGE_EVENT, handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(LANG_CHANGE_EVENT, handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  // Priority after login: explicit pre-login choice > saved profile > active/browser fallback.
  const profileLang = profile?.language as Language | undefined;
  const lang: Language = preLoginLang || profileLang || storedLang;

  // Keep localStorage in sync with saved preferences unless a pre-login choice is being applied.
  useEffect(() => {
    if (profileLang && !preLoginLang) {
      setStoredLang(profileLang);
    }
  }, [profileLang, preLoginLang]);

  // Apply the explicit pre-login language to the authenticated profile, then release the override.
  useEffect(() => {
    if (!profile || !preLoginLang) return;
    if (profileLang === preLoginLang) {
      clearPreLoginLang();
      setPreLoginLangState(null);
      return;
    }
    if (!updateProfile.isPending) {
      updateProfile.mutate({ language: preLoginLang });
    }
  }, [profile, profileLang, preLoginLang, updateProfile]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string =>
      translateFor(lang, key, params),
    [lang]
  );

  const setLang = useCallback((newLang: Language) => {
    clearPreLoginLang();
    setStoredLang(newLang);
    setStoredLangState(newLang);
    setPreLoginLangState(null);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
