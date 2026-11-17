import type { AppLanguage } from "@/i18n/translations";
import type { LegalDoc } from "@/legal/types";
import { cookiesEn } from "./en";
import { cookiesUk } from "./uk";
import { cookiesPl } from "./pl";
import { cookiesFr } from "./fr";
import { cookiesRu } from "./ru";
import { currentLegalContent } from '../currentLegalContent';

export const COOKIES_CONTENT: Record<AppLanguage, LegalDoc> = currentLegalContent({
  en: cookiesEn,
  // German legal text is not yet reviewed; show the English version.
  de: cookiesEn,
  uk: cookiesUk,
  pl: cookiesPl,
  fr: cookiesFr,
  ru: cookiesRu,
}, 'cookies');
