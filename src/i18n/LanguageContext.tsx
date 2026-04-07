import { createContext, useContext, ReactNode, useCallback } from "react";
import { translations, Language, TranslationKey } from "./translations";
import { useProfile } from "@/hooks/useData";

interface LanguageContextType {
  lang: Language;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const lang: Language = (profile?.language as Language) || "en";

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const entry = translations[key];
      if (!entry) return key;
      let text = entry[lang] || entry.en;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
