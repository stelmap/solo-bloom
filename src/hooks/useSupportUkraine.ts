import { useCallback, useEffect, useMemo, useState } from "react";
import { useProfile } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { track } from "@/lib/analytics";
import {
  SUPPORT_UA_PROMO_CODE,
  campaignText,
  normalizePromoCode,
  readStoredPromoCode,
  resolveCampaignEligibility,
  storePromoCode,
  validatePromoCode,
  type CampaignEligibilityReason,
  type PromoValidationStatus,
} from "@/lib/supportUkraine";

/**
 * Resolves "Support Ukrainian Psychotherapists" eligibility for the current
 * visitor. Works both signed-in (practice country / practice language) and
 * anonymous on the landing page (UI language / stored promo code).
 *
 * Eligibility is recalculated automatically whenever practice country or
 * language changes, because both are derived from live query state.
 */
export function useSupportUkraine(langOverride?: string) {
  const { data: profile } = useProfile();
  const { lang: appLang } = useLanguage();
  const lang = langOverride ?? appLang;
  const [promoCode, setPromoCode] = useState<string | null>(() => readStoredPromoCode());

  const country = (profile as any)?.business_country as string | undefined;
  const practiceLanguage = ((profile as any)?.language as string | undefined) ?? lang;

  const { eligible, reason } = useMemo(
    () => resolveCampaignEligibility({ country, language: practiceLanguage, promoCode }),
    [country, practiceLanguage, promoCode],
  );

  // Fire the auto-apply event once per eligibility transition (not for promo codes).
  useEffect(() => {
    if (!eligible || reason === "promo_code") return;
    track("support_ukraine_discount_auto_applied", {
      practice_country: country ?? null,
      practice_language: practiceLanguage ?? null,
      eligibility_reason: reason,
      promo_code_used: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, reason]);

  const applyPromoCode = useCallback(
    (input: string, planCode?: string | null): { status: PromoValidationStatus; message: string } => {
      track("support_ukraine_promo_entered", { promo_code_used: normalizePromoCode(input) });
      const status = validatePromoCode(input, { alreadyEligible: eligible, planCode });
      const messageKey =
        status === "applied"
          ? "promoApplied"
          : status === "already_active"
            ? "promoAlreadyActive"
            : status === "not_applicable"
              ? "promoNotApplicable"
              : status === "expired"
                ? "promoExpired"
                : "promoInvalid";
      if (status === "applied" || status === "already_active") {
        storePromoCode(SUPPORT_UA_PROMO_CODE);
        setPromoCode(SUPPORT_UA_PROMO_CODE);
        track("support_ukraine_promo_applied", {
          promo_code_used: SUPPORT_UA_PROMO_CODE,
          eligibility_reason: status === "already_active" ? reason : "promo_code",
          selected_plan: planCode ?? null,
        });
      } else {
        track("support_ukraine_promo_failed", {
          promo_code_used: normalizePromoCode(input),
          reason: status,
          selected_plan: planCode ?? null,
        });
      }
      return { status, message: campaignText(lang, messageKey) };
    },
    [eligible, lang, reason],
  );

  return {
    lang,
    eligible,
    /** Why the discount is active — country, language or an entered promo code. */
    reason: reason as CampaignEligibilityReason,
    promoCode,
    applyPromoCode,
    practiceCountry: country ?? null,
    practiceLanguage: practiceLanguage ?? null,
    /** Analytics props shared by every campaign event. */
    baseEventProps: {
      practice_country: country ?? null,
      practice_language: practiceLanguage ?? null,
      eligibility_reason: reason,
      promo_code_used: promoCode,
    } as Record<string, unknown>,
  };
}
