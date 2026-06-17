import { fr, pl, uk, ru, enUS, type Locale } from "date-fns/locale";
import { format as fnsFormat } from "date-fns";
import type { Language } from "@/i18n/translations";
import { useLanguage } from "@/i18n/LanguageContext";

export function getDateLocale(lang: Language | string | undefined): Locale {
  switch (lang) {
    case "fr":
      return fr;
    case "pl":
      return pl;
    case "uk":
      return uk;
    case "ru":
      return ru;
    default:
      return enUS;
  }
}

/** Hook returning a `format` function bound to the current app language locale. */
export function useDateFormat() {
  const { lang } = useLanguage();
  const locale = getDateLocale(lang);
  return (date: Date | number, fmt: string) => fnsFormat(date, fmt, { locale });
}

export function useDateLocale(): Locale {
  const { lang } = useLanguage();
  return getDateLocale(lang);
}
