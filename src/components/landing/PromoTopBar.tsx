import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { AppLanguage } from "@/i18n/translations";
import { lt } from "@/lib/landingRedesignCopy";
import { track } from "@/lib/analytics";
import {
  dismissPromoBar,
  isCampaignActive,
  isPromoBarDismissed,
  landingEventProps,
} from "@/lib/landingCampaign";

interface Props {
  lang: AppLanguage;
  /** Activates the campaign offer (stores the offer reference + scrolls to pricing). */
  onActivate: () => void;
}

/**
 * Ukraine-support promo bar rendered above the navigation. Dismissal is stored
 * in localStorage for 7 days. The bar only *references* the campaign — the
 * discount itself is validated and applied server-side at checkout.
 */
export function PromoTopBar({ lang, onActivate }: Props) {
  const [visible, setVisible] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (isCampaignActive() && !isPromoBarDismissed()) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible || viewed.current) return;
    viewed.current = true;
    track("promo_banner_view", landingEventProps({ locale: lang, source_page: "/" }));
  }, [visible, lang]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={lt(lang, "promoBarText")}
      className="relative z-[60] bg-secondary text-secondary-foreground"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-10 py-2 text-center sm:px-14">
        <span aria-hidden="true" className="inline-block h-3.5 w-5 overflow-hidden rounded-[2px]">
          <span className="block h-1/2 bg-[hsl(214_85%_52%)]" />
          <span className="block h-1/2 bg-[hsl(47_95%_55%)]" />
        </span>
        <strong className="text-xs font-semibold sm:text-sm">{lt(lang, "promoBarText")}</strong>
        <button
          type="button"
          onClick={() => {
            track("promo_activate_click", landingEventProps({ locale: lang, source_page: "/", placement: "top_bar" }));
            onActivate();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {lt(lang, "promoBarCta")} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        aria-label={lt(lang, "promoBarClose")}
        onClick={() => {
          dismissPromoBar();
          setVisible(false);
          track("promo_banner_close", landingEventProps({ locale: lang, source_page: "/" }));
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 opacity-75 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default PromoTopBar;
