import { createContext, useContext, ReactNode, useCallback, useEffect, useState } from "react";
import { Language, AppLanguage, TranslationKey, getDict, loadLocale, englishDict } from "./translations";
import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { track } from "@/lib/analytics";

const LANG_STORAGE_KEY = "app_lang";
const PRE_LOGIN_LANG_KEY = "pre_login_lang";
const LANG_CHANGE_EVENT = "app_lang_change";

function normalizeLang(value: string | null | undefined): AppLanguage | null {
  if (value === "uk" || value === "fr" || value === "en" || value === "pl" || value === "ru") return value;
  return null;
}

function getBrowserLang(): AppLanguage {
  try {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("uk")) return "uk";
    if (browserLang.startsWith("ru")) return "ru";
    if (browserLang.startsWith("fr")) return "fr";
    if (browserLang.startsWith("pl")) return "pl";
  } catch {}
  return "en";
}

interface LanguageContextType {
  lang: AppLanguage;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  setLang: (lang: AppLanguage) => void;
}

/** Translate a key for a specific language (standalone, no hook needed) */
export function translateFor(
  lang: AppLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dict = getDict(lang);
  let text: string | undefined = dict[key];
  if (text === undefined) {
    text = englishDict[key];
  }
  if (text === undefined) {
    const fallback = key.includes(".") ? key.split(".").pop() ?? key : key;
    return fallback.charAt(0).toUpperCase() + fallback.slice(1).replace(/([A-Z])/g, " $1");
  }
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      const re = new RegExp(`\\{\\s*${k}\\s*\\}`, "g");
      text = (text as string).replace(re, String(v));
    });
  }
  return text;
}

/** Read the language stored in localStorage (used before profile loads) */
export function getStoredLang(): AppLanguage {
  try {
    const stored = normalizeLang(localStorage.getItem(LANG_STORAGE_KEY) || localStorage.getItem("landing_lang"));
    if (stored) return stored;
  } catch {}
  return getBrowserLang();
}

export function getPreLoginLang(): AppLanguage | null {
  try {
    return normalizeLang(localStorage.getItem(PRE_LOGIN_LANG_KEY));
  } catch {}
  return null;
}

/** Persist language choice to localStorage */
export function setStoredLang(lang: AppLanguage) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    localStorage.setItem("landing_lang", lang); // keep landing page in sync
    window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: lang }));
  } catch {}
}

/** Persist the explicit language chosen before authentication. */
export function setPreLoginLang(lang: AppLanguage) {
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
  const [storedLang, setStoredLangState] = useState<AppLanguage>(() => getStoredLang());
  const [preLoginLang, setPreLoginLangState] = useState<AppLanguage | null>(() => getPreLoginLang());
  // Bumped each time a non-EN locale finishes loading so consumers re-render.
  const [localeVersion, setLocaleVersion] = useState(0);

  // Listen for in-app language changes (e.g. from landing page toggle)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AppLanguage>).detail;
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
  const profileLang = profile?.language as AppLanguage | undefined;
  const lang: AppLanguage = preLoginLang || profileLang || storedLang;

  // Lazily fetch non-English locales on first use, then trigger a re-render.
  useEffect(() => {
    if (lang === "en") return;
    let cancelled = false;
    loadLocale(lang).then(() => {
      if (!cancelled) setLocaleVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

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
    // localeVersion bump invalidates memo so consumers re-render once a lazy locale arrives.
    [lang, localeVersion]
  );

  const setLang = useCallback((newLang: AppLanguage) => {
    clearPreLoginLang();
    setStoredLang(newLang);
    setStoredLangState(newLang);
    setPreLoginLangState(null);
    track("language_changed", { language: newLang });
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
