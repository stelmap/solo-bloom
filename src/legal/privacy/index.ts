import type { AppLanguage } from "@/i18n/translations";
import type { LegalDoc } from "@/legal/types";
import { privacyEn } from "./en";
import { privacyUk } from "./uk";
import { privacyPl } from "./pl";
import { privacyFr } from "./fr";
import { privacyRu } from "./ru";

export const PRIVACY_CONTENT: Record<AppLanguage, LegalDoc> = {
  en: privacyEn,
  uk: privacyUk,
  pl: privacyPl,
  fr: privacyFr,
  ru: privacyRu,
};
