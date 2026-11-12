import type { AppLanguage } from "@/i18n/translations";
import type { LegalDoc } from "@/legal/types";
import { refundEn } from "./en";
import { refundUk } from "./uk";
import { refundPl } from "./pl";
import { refundFr } from "./fr";
import { refundRu } from "./ru";

export const REFUND_CONTENT: Record<AppLanguage, LegalDoc> = {
  en: refundEn,
  // German legal text is not yet reviewed; show the English version.
  de: refundEn,
  uk: refundUk,
  pl: refundPl,
  fr: refundFr,
  ru: refundRu,
};
