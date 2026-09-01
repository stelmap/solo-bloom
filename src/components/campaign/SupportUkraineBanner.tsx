import { useEffect, useRef } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { campaignText } from "@/lib/supportUkraine";
import bannerAsset from "@/assets/support-ukraine-banner.png.asset.json";

interface Props {
  lang: string;
  eligible: boolean;
  /** Scrolls to pricing. */
  onPrimaryCta: () => void;
  onSecondaryCta?: () => void;
  eventProps?: Record<string, unknown>;
  className?: string;
}

/**
 * "Support Ukrainian Psychotherapists" campaign banner.
 * Calm, dignified layout: copy + CTAs on the left, illustration on the right;
 * on mobile the copy stacks above the illustration.
 */
export function SupportUkraineBanner({
  lang,
  eligible,
  onPrimaryCta,
  onSecondaryCta,
  eventProps = {},
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !seen.current) {
          seen.current = true;
          track("support_ukraine_banner_viewed", { ...eventProps, locale: lang });
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={`px-4 sm:px-6 ${className}`} aria-labelledby="support-ua-title">
      <div
        ref={ref}
        className="max-w-6xl mx-auto relative overflow-hidden rounded-3xl border border-border bg-orange-50/70 shadow-sm"
      >
        {/* Subtle blue & yellow campaign accents */}
        <div className="absolute inset-x-0 top-0 h-1.5 flex" aria-hidden="true">
          <div className="flex-1 bg-[hsl(214_85%_52%)]" />
          <div className="flex-1 bg-[hsl(47_95%_55%)]" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center p-6 sm:p-10">
          <div className="order-1">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary mb-3">
              {campaignText(lang, "bannerEyebrow")}
            </p>
            <h2 id="support-ua-title" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {campaignText(lang, "bannerTitle")}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              {campaignText(lang, "bannerDescription")}
            </p>
            <p className="text-base font-semibold text-foreground mb-6">
              {campaignText(lang, "bannerDiscount")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="h-12 px-6 rounded-xl font-semibold gap-2"
                onClick={() => {
                  track("support_ukraine_cta_clicked", { ...eventProps, locale: lang, cta: "primary" });
                  onPrimaryCta();
                }}
              >
                {eligible ? (
                  <>
                    <Check className="h-4 w-4" /> {campaignText(lang, "bannerCtaActive")}
                  </>
                ) : (
                  <>
                    {campaignText(lang, "bannerCtaPrimary")} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 rounded-xl font-semibold bg-card"
                onClick={() => {
                  track("support_ukraine_cta_clicked", { ...eventProps, locale: lang, cta: "secondary" });
                  (onSecondaryCta ?? onPrimaryCta)();
                }}
              >
                {campaignText(lang, "bannerCtaSecondary")}
              </Button>
            </div>

            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              {campaignText(lang, "bannerSubline")}
            </p>
          </div>

          <div className="order-2">
            <img
              src={bannerAsset.url}
              alt={campaignText(lang, "bannerImageAlt")}
              loading="lazy"
              className="w-full h-auto rounded-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default SupportUkraineBanner;
