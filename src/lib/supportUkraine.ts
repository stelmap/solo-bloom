// ─────────────────────────────────────────────────────────────────────────────
// "Support Ukrainian Psychotherapists" campaign
//
// Single source of truth for the campaign: promo code, eligibility rules,
// price maths and all localized copy. UI components must not hardcode copy —
// they read it from `campaignText()`.
// ─────────────────────────────────────────────────────────────────────────────

import type { AppLanguage } from "@/i18n/translations";

export const SUPPORT_UA_PROMO_CODE = "SUPPORT_UA_PSYCHOTHERAPY_50";
export const SUPPORT_UA_DISCOUNT_PERCENT = 50;
/** Plans the campaign applies to. Free Starter is excluded (already free). */
export const SUPPORT_UA_PLAN_CODES = ["solo", "pro"] as const;
export const SUPPORT_UA_STORAGE_KEY = "solobizz.support_ua_promo";

export type CampaignEligibilityReason = "country" | "language" | "promo_code" | null;

export interface CampaignEligibility {
  eligible: boolean;
  reason: CampaignEligibilityReason;
}

/** Values that identify Ukraine as the practice country. */
const UA_COUNTRY_VALUES = new Set(["ua", "ukr", "ukraine", "україна", "украина"]);

export function isUkraineCountry(country?: string | null): boolean {
  if (!country) return false;
  return UA_COUNTRY_VALUES.has(String(country).trim().toLowerCase());
}

export function isUkrainianLanguage(language?: string | null): boolean {
  return String(language ?? "").trim().toLowerCase() === "uk";
}

/**
 * Eligibility is a pure function of practice country, practice/UI language and
 * an explicitly entered promo code. Country and language are re-evaluated on
 * every render, so changing either recalculates eligibility automatically.
 */
export function resolveCampaignEligibility(input: {
  country?: string | null;
  language?: string | null;
  promoCode?: string | null;
}): CampaignEligibility {
  if (isUkraineCountry(input.country)) return { eligible: true, reason: "country" };
  if (isUkrainianLanguage(input.language)) return { eligible: true, reason: "language" };
  if (normalizePromoCode(input.promoCode) === SUPPORT_UA_PROMO_CODE) {
    return { eligible: true, reason: "promo_code" };
  }
  return { eligible: false, reason: null };
}

export function normalizePromoCode(code?: string | null): string {
  return String(code ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function isCampaignPlan(planCode?: string | null): boolean {
  return (SUPPORT_UA_PLAN_CODES as readonly string[]).includes(String(planCode ?? ""));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Campaign price = standard price for the period, minus 50%. Applied once. */
export function campaignPrice(standardPrice: number): number {
  return round2(standardPrice * (1 - SUPPORT_UA_DISCOUNT_PERCENT / 100));
}

export function campaignDiscountAmount(standardPrice: number): number {
  return round2(standardPrice - campaignPrice(standardPrice));
}

export function perMonthEquivalent(amount: number, period: "monthly" | "quarterly" | "yearly"): number {
  const months = period === "quarterly" ? 3 : period === "yearly" ? 12 : 1;
  return round2(amount / months);
}

export type PromoValidationStatus = "applied" | "already_active" | "invalid" | "not_applicable" | "expired";

export function validatePromoCode(
  input: string,
  opts: { alreadyEligible?: boolean; planCode?: string | null; expired?: boolean } = {},
): PromoValidationStatus {
  const code = normalizePromoCode(input);
  if (code !== SUPPORT_UA_PROMO_CODE) return "invalid";
  if (opts.expired) return "expired";
  if (opts.planCode !== undefined && opts.planCode !== null && !isCampaignPlan(opts.planCode)) {
    return "not_applicable";
  }
  if (opts.alreadyEligible) return "already_active";
  return "applied";
}

export function readStoredPromoCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SUPPORT_UA_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storePromoCode(code: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (code) window.localStorage.setItem(SUPPORT_UA_STORAGE_KEY, normalizePromoCode(code));
    else window.localStorage.removeItem(SUPPORT_UA_STORAGE_KEY);
  } catch {
    /* storage unavailable — ignore */
  }
}

// ── Localized copy ───────────────────────────────────────────────────────────

type Localized = Partial<Record<AppLanguage, string>> & { en: string };

export const SUPPORT_UA_COPY = {
  campaignName: {
    en: "Support Ukrainian Psychotherapists",
    uk: "Підтримка українських психотерапевтів",
    pl: "Wsparcie ukraińskich psychoterapeutów",
    fr: "Soutien aux psychothérapeutes ukrainiens",
    ru: "Поддержка украинских психотерапевтов",
  },
  bannerEyebrow: {
    en: "SUPPORT UKRAINIAN PSYCHOTHERAPISTS",
    uk: "ПІДТРИМКА УКРАЇНСЬКИХ ПСИХОТЕРАПЕВТІВ",
    pl: "WSPARCIE UKRAIŃSKICH PSYCHOTERAPEUTÓW",
    fr: "SOUTIEN AUX PSYCHOTHÉRAPEUTES UKRAINIENS",
    ru: "ПОДДЕРЖКА УКРАИНСКИХ ПСИХОТЕРАПЕВТОВ",
  },
  bannerTitle: {
    en: "Your practice stays with you",
    uk: "Ваша практика залишається з вами",
    pl: "Twoja praktyka zostaje z Tobą",
    fr: "Votre pratique reste avec vous",
    ru: "Ваша практика остаётся с вами",
  },
  bannerDescription: {
    en: "We understand how important it is to maintain continuity of care and access to essential practice information. Even if paper records are lost or damaged, your key client, session, payment and scheduling information can remain accessible online in SoloBizz.",
    uk: "Ми знаємо, наскільки важливо зараз зберігати безперервність роботи та доступ до необхідної інформації. Навіть якщо паперові записи буде втрачено або пошкоджено, основні дані про клієнтів, сесії, оплату та розклад залишатимуться доступними онлайн у SoloBizz.",
    pl: "Wiemy, jak ważne jest zachowanie ciągłości pracy i dostępu do niezbędnych informacji. Nawet jeśli papierowe zapiski zostaną utracone lub zniszczone, kluczowe dane o klientach, sesjach, płatnościach i grafiku pozostaną dostępne online w SoloBizz.",
    fr: "Nous savons combien il est important de maintenir la continuité du suivi et l'accès aux informations essentielles. Même si les dossiers papier sont perdus ou endommagés, vos données clés sur les clients, les séances, les paiements et l'agenda restent accessibles en ligne dans SoloBizz.",
    ru: "Мы понимаем, насколько важно сохранять непрерывность работы и доступ к необходимой информации. Даже если бумажные записи будут утрачены или повреждены, основные данные о клиентах, сессиях, оплатах и расписании останутся доступными онлайн в SoloBizz.",
  },
  bannerDiscount: {
    en: "Psychologists and psychotherapists connected with Ukraine can receive 50% off Solo Practice and Pro Practice.",
    uk: "Для психотерапевтів і психологів з України діє знижка 50% на Solo Practice та Pro Practice.",
    pl: "Psycholodzy i psychoterapeuci związani z Ukrainą otrzymują 50% zniżki na Solo Practice i Pro Practice.",
    fr: "Les psychologues et psychothérapeutes liés à l'Ukraine bénéficient de 50 % de réduction sur Solo Practice et Pro Practice.",
    ru: "Для психотерапевтов и психологов из Украины действует скидка 50% на Solo Practice и Pro Practice.",
  },
  bannerCtaPrimary: {
    en: "Get 50% off",
    uk: "Отримати знижку 50%",
    pl: "Odbierz 50% zniżki",
    fr: "Obtenir −50 %",
    ru: "Получить скидку 50%",
  },
  bannerCtaActive: {
    en: "50% discount activated",
    uk: "Знижку 50% активовано",
    pl: "Zniżka 50% aktywowana",
    fr: "Réduction de 50 % activée",
    ru: "Скидка 50% активирована",
  },
  bannerCtaSecondary: {
    en: "Learn more",
    uk: "Дізнатися більше",
    pl: "Dowiedz się więcej",
    fr: "En savoir plus",
    ru: "Узнать больше",
  },
  bannerSubline: {
    en: "Support Ukrainian Psychotherapists · Special offer for Ukrainian professionals",
    uk: "Support Ukrainian Psychotherapists · Спеціальна пропозиція для українських фахівців",
    pl: "Support Ukrainian Psychotherapists · Oferta specjalna dla ukraińskich specjalistów",
    fr: "Support Ukrainian Psychotherapists · Offre spéciale pour les professionnels ukrainiens",
    ru: "Support Ukrainian Psychotherapists · Специальное предложение для украинских специалистов",
  },
  bannerImageAlt: {
    en: "Therapist working online, practice data securely stored in the cloud",
    uk: "Терапевтка працює онлайн, дані практики надійно збережені в хмарі",
    pl: "Terapeutka pracuje online, dane praktyki bezpiecznie w chmurze",
    fr: "Thérapeute travaillant en ligne, données de la pratique sécurisées dans le cloud",
    ru: "Терапевт работает онлайн, данные практики надёжно хранятся в облаке",
  },
  badgeShort: { en: "−50%", uk: "−50%", pl: "−50%", fr: "−50 %", ru: "−50%" },
  badgeCampaign: {
    en: "Support Ukraine −50%",
    uk: "Підтримка України −50%",
    pl: "Wsparcie Ukrainy −50%",
    fr: "Soutien Ukraine −50 %",
    ru: "Поддержка Украины −50%",
  },
  equivalentPerMonth: {
    en: "Equivalent to {price} / month",
    uk: "Еквівалент {price} / місяць",
    pl: "Równowartość {price} / miesiąc",
    fr: "Équivalent à {price} / mois",
    ru: "Эквивалент {price} / месяц",
  },
  freeStarterNote: {
    en: "The free plan is available too",
    uk: "Безкоштовний план також доступний",
    pl: "Plan bezpłatny również jest dostępny",
    fr: "Le forfait gratuit reste disponible",
    ru: "Бесплатный план также доступен",
  },
  eligibilityNotice: {
    en: "The discount is applied to your practice based on the selected country or language.",
    uk: "Знижку застосовано до вашої практики відповідно до вибраної країни або мови.",
    pl: "Zniżka została zastosowana do Twojej praktyki na podstawie wybranego kraju lub języka.",
    fr: "La réduction est appliquée à votre pratique selon le pays ou la langue sélectionnés.",
    ru: "Скидка применена к вашей практике в соответствии с выбранной страной или языком.",
  },
  discountApplied: {
    en: "50% discount applied",
    uk: "Знижку 50% застосовано",
    pl: "Zastosowano 50% zniżki",
    fr: "Réduction de 50 % appliquée",
    ru: "Скидка 50% применена",
  },
  checkoutRegularPrice: {
    en: "Regular price",
    uk: "Звичайна ціна",
    pl: "Cena standardowa",
    fr: "Prix normal",
    ru: "Обычная цена",
  },
  checkoutBillingDiscount: {
    en: "Billing period discount",
    uk: "Знижка за період оплати",
    pl: "Zniżka za okres rozliczeniowy",
    fr: "Remise selon la période de facturation",
    ru: "Скидка за период оплаты",
  },
  checkoutCampaignDiscount: {
    en: "Support Ukraine discount",
    uk: "Знижка «Підтримка України»",
    pl: "Zniżka „Wsparcie Ukrainy”",
    fr: "Remise « Soutien Ukraine »",
    ru: "Скидка «Поддержка Украины»",
  },
  checkoutDueToday: {
    en: "Due today",
    uk: "До сплати сьогодні",
    pl: "Do zapłaty dziś",
    fr: "À payer aujourd'hui",
    ru: "К оплате сегодня",
  },
  checkoutRenewal: {
    en: "Renews at {price} on {date}",
    uk: "Поновлення на {price} — {date}",
    pl: "Odnowienie za {price} dnia {date}",
    fr: "Renouvellement à {price} le {date}",
    ru: "Продление на {price} — {date}",
  },
  promoLabel: {
    en: "Have a promo code?",
    uk: "Маєте промокод?",
    pl: "Masz kod promocyjny?",
    fr: "Vous avez un code promo ?",
    ru: "Есть промокод?",
  },
  promoPlaceholder: { en: "Promo code", uk: "Промокод", pl: "Kod promocyjny", fr: "Code promo", ru: "Промокод" },
  promoApply: { en: "Apply", uk: "Застосувати", pl: "Zastosuj", fr: "Appliquer", ru: "Применить" },
  promoApplied: {
    en: "50% discount activated.",
    uk: "Знижку 50% активовано.",
    pl: "Zniżka 50% została aktywowana.",
    fr: "Réduction de 50 % activée.",
    ru: "Скидка 50% активирована.",
  },
  promoAlreadyActive: {
    en: "The discount is already applied to your practice.",
    uk: "Знижку вже застосовано до вашої практики.",
    pl: "Zniżka jest już zastosowana do Twojej praktyki.",
    fr: "La réduction est déjà appliquée à votre pratique.",
    ru: "Скидка уже применена к вашей практике.",
  },
  promoInvalid: {
    en: "This promo code is invalid or no longer available.",
    uk: "Промокод недійсний або більше не доступний.",
    pl: "Kod promocyjny jest nieprawidłowy lub już niedostępny.",
    fr: "Ce code promo est invalide ou n'est plus disponible.",
    ru: "Промокод недействителен или больше не доступен.",
  },
  promoNotApplicable: {
    en: "The promo code applies to Solo Practice and Pro Practice.",
    uk: "Промокод застосовується до Solo Practice та Pro Practice.",
    pl: "Kod promocyjny dotyczy planów Solo Practice i Pro Practice.",
    fr: "Le code promo s'applique à Solo Practice et Pro Practice.",
    ru: "Промокод применяется к Solo Practice и Pro Practice.",
  },
  promoExpired: {
    en: "This promo code has expired.",
    uk: "Термін дії промокоду завершився.",
    pl: "Kod promocyjny wygasł.",
    fr: "Ce code promo a expiré.",
    ru: "Срок действия промокода истёк.",
  },
  billingCampaignLabel: { en: "Campaign", uk: "Кампанія", pl: "Kampania", fr: "Campagne", ru: "Кампания" },
  billingDiscountLabel: { en: "Discount", uk: "Знижка", pl: "Zniżka", fr: "Remise", ru: "Скидка" },
  billingStatusLabel: { en: "Status", uk: "Статус", pl: "Status", fr: "Statut", ru: "Статус" },
  billingStatusActive: { en: "Active", uk: "Активна", pl: "Aktywna", fr: "Active", ru: "Активна" },
  billingAppliedToLabel: { en: "Applied to", uk: "Застосовується до", pl: "Dotyczy", fr: "Appliquée à", ru: "Применяется к" },
  billingPeriodLabel: { en: "Billing period", uk: "Період оплати", pl: "Okres rozliczeniowy", fr: "Période de facturation", ru: "Период оплаты" },
  billingNextPaymentLabel: { en: "Next payment", uk: "Наступний платіж", pl: "Następna płatność", fr: "Prochain paiement", ru: "Следующий платёж" },
  renewalNotice: {
    en: "Eligibility changes affect the next renewal only — your current paid period is never changed retroactively.",
    uk: "Зміна умов участі впливає лише на наступне поновлення — поточний оплачений період не змінюється заднім числом.",
    pl: "Zmiana uprawnień wpływa tylko na kolejne odnowienie — bieżący opłacony okres nie zmienia się wstecz.",
    fr: "Un changement d'éligibilité n'affecte que le prochain renouvellement — la période payée en cours n'est jamais modifiée rétroactivement.",
    ru: "Изменение условий участия влияет только на следующее продление — текущий оплаченный период не меняется задним числом.",
  },
} satisfies Record<string, Localized>;

export type CampaignCopyKey = keyof typeof SUPPORT_UA_COPY;

export function campaignText(
  lang: AppLanguage | string | undefined,
  key: CampaignCopyKey,
  params?: Record<string, string>,
): string {
  const entry = SUPPORT_UA_COPY[key] as Partial<Record<string, string>>;
  let out = entry[(lang ?? "en") as string] ?? entry.en ?? "";
  if (params) {
    for (const [k, v] of Object.entries(params)) out = out.replace(`{${k}}`, v);
  }
  return out;
}

export function formatEuro(amount: number): string {
  if (amount === 0) return "€0";
  return Number.isInteger(amount) ? `€${amount}` : `€${amount.toFixed(2)}`;
}
