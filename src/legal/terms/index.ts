import type { AppLanguage } from "@/i18n/translations";
import type { LegalDoc } from "@/legal/types";
import { termsEn } from "./en";
import { termsUk } from "./uk";
import { termsPl } from "./pl";
import { termsFr } from "./fr";
import { termsRu } from "./ru";

export const TERMS_CONTENT: Record<AppLanguage, LegalDoc> = {
  en: termsEn,
  uk: termsUk,
  pl: termsPl,
  fr: termsFr,
  ru: termsRu,
};
