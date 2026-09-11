import type { AppLanguage } from "@/i18n/translations";
import type { LegalDoc } from "@/legal/types";
import { cookiesEn } from "./en";
import { cookiesUk } from "./uk";
import { cookiesPl } from "./pl";
import { cookiesFr } from "./fr";
import { cookiesRu } from "./ru";

export const COOKIES_CONTENT: Record<AppLanguage, LegalDoc> = {
  en: cookiesEn,
  uk: cookiesUk,
  pl: cookiesPl,
  fr: cookiesFr,
  ru: cookiesRu,
};
