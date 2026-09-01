import { campaignPrice, campaignText, formatEuro, perMonthEquivalent } from "@/lib/supportUkraine";

export type CampaignCycle = "monthly" | "quarterly" | "yearly";

interface Props {
  lang: string;
  /** Standard price for the selected billing period (already includes the quarterly/yearly discount). */
  standardPrice: number;
  cycle: CampaignCycle;
  /** e.g. "/ month" */
  perLabel: string;
  eligible: boolean;
  /** Free plans never show the campaign discount. */
  isFree?: boolean;
  /** Renders the standard (non-campaign) equivalent-per-month line. */
  fallbackSubMicro?: string;
  currencyFormat?: (n: number) => string;
}

/**
 * Price block used by both the landing pricing cards and the in-app plans page.
 * When the campaign applies it shows: struck-through standard price, a −50%
 * badge, the campaign price as the dominant value, and the effective
 * per-month equivalent for quarterly/yearly billing.
 */
export function SupportUkrainePrice({
  lang,
  standardPrice,
  cycle,
  perLabel,
  eligible,
  isFree = false,
  fallbackSubMicro,
  currencyFormat = formatEuro,
}: Props) {
  const applies = eligible && !isFree && standardPrice > 0;
  const finalPrice = applies ? campaignPrice(standardPrice) : standardPrice;
  const equivalent =
    !isFree && cycle !== "monthly" ? currencyFormat(perMonthEquivalent(finalPrice, cycle)) : null;

  return (
    <div>
      {applies && (
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-base text-muted-foreground line-through">{currencyFormat(standardPrice)}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[hsl(214_85%_52%)] text-white">
            {campaignText(lang, "badgeShort")}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[hsl(47_95%_88%)] text-[hsl(35_60%_28%)] border border-[hsl(47_80%_70%)]">
            {campaignText(lang, "badgeCampaign")}
          </span>
        </div>
      )}

      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-bold text-foreground">{currencyFormat(finalPrice)}</span>
        <span className="text-muted-foreground text-base">{perLabel}</span>
      </div>

      {applies && (
        <p className="mt-1.5 text-xs font-medium text-primary">{campaignText(lang, "campaignName")}</p>
      )}

      {equivalent && (
        <p className="mt-1 text-xs text-muted-foreground">
          {campaignText(lang, "equivalentPerMonth", { price: equivalent })}
        </p>
      )}
      {!equivalent && fallbackSubMicro ? (
        <p className="mt-1 text-xs text-muted-foreground">{fallbackSubMicro}</p>
      ) : null}
    </div>
  );
}

export default SupportUkrainePrice;
