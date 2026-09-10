import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppLanguage } from "@/i18n/translations";
import { lt, type LandingCopyKey } from "@/lib/landingRedesignCopy";
import { track } from "@/lib/analytics";
import { landingEventProps } from "@/lib/landingCampaign";
import overviewAsset from "@/assets/hero-overview.png";
import todayAsset from "@/assets/hero-today.png";
import calendarAsset from "@/assets/hero-calendar.png";
import clientAsset from "@/assets/hero-client.png";
import bookingAsset from "@/assets/hero-booking.png";
import overviewDashboardAsset from "@/assets/hero-overview-dashboard.png";

export interface HeroSlide {
  id: string;
  tab: LandingCopyKey;
  label: LandingCopyKey;
  title: LandingCopyKey;
  title2?: LandingCopyKey;
  body: LandingCopyKey;
  alt: LandingCopyKey;
  image: string;
  contain?: boolean;
  composition?: boolean;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "overview",
    tab: "heroTabOverview",
    label: "heroOverviewLabel",
    title: "heroOverviewTitle1",
    title2: "heroOverviewTitle2",
    body: "heroOverviewBody",
    alt: "altOverviewComposition",
    image: overviewDashboardAsset,
    composition: true,
  },
  { id: "today", tab: "heroTabToday", label: "heroTabToday", title: "heroTodayTitle", body: "heroTodayBody", alt: "altDashboard", image: todayAsset },
  { id: "calendar", tab: "heroTabCalendar", label: "heroTabCalendar", title: "heroCalendarTitle", body: "heroCalendarBody", alt: "altCalendar", image: calendarAsset },
  { id: "clients", tab: "heroTabClients", label: "heroTabClients", title: "heroClientsTitle", body: "heroClientsBody", alt: "altClient", image: clientAsset },
  { id: "finance", tab: "heroTabFinance", label: "heroTabFinance", title: "heroFinanceTitle", body: "heroFinanceBody", alt: "altFinance", image: overviewAsset },
  { id: "booking", tab: "heroTabBooking", label: "heroTabBooking", title: "heroBookingTitle", body: "heroBookingBody", alt: "altBooking", image: bookingAsset, contain: true },
];

/** Right-hand product carousel of the hero: tabs, screenshot, arrows, counter. */
export function HeroCarousel({
  lang,
  index,
  onSelect,
}: {
  lang: AppLanguage;
  index: number;
  onSelect: (next: number) => void;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Index actually painted in the frame — only advances once its image is ready.
  const [shown, setShown] = useState(index);
  const [ready, setReady] = useState<Record<string, boolean>>({ [HERO_SLIDES[0].image]: false });
  const last = HERO_SLIDES.length - 1;

  // Preload every screenshot right after the first render.
  useEffect(() => {
    let cancelled = false;
    const markReady = (src: string) =>
      !cancelled && setReady((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
    HERO_SLIDES.forEach((s) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => markReady(s.image);
      img.onerror = () => markReady(s.image);
      img.src = s.image;
      if (img.complete) markReady(s.image);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Swap the visible screenshot only when the requested one has finished loading.
  useEffect(() => {
    if (index === shown) return;
    if (ready[HERO_SLIDES[index].image]) setShown(index);
  }, [index, shown, ready]);

  const active = HERO_SLIDES[shown];
  const loading = index !== shown;

  const select = useCallback(
    (next: number, focus = false) => {
      if (next < 0 || next > last) return;
      onSelect(next);
      track("hero_product_tab_click", landingEventProps({ locale: lang, source_page: "/", tab: HERO_SLIDES[next].id }));
      if (focus) tabRefs.current[next]?.focus();
    },
    [lang, onSelect, last],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      select(Math.min(index + 1, last), true);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      select(Math.max(index - 1, 0), true);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      select(last, true);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 px-5 sm:px-6 lg:w-[85%] lg:px-0">
      <div
        role="tablist"
        aria-label={lt(lang, "heroCarouselLabel")}
        onKeyDown={onKeyDown}
        className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-wrap"
      >
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            role="tab"
            id={`hero-tab-${s.id}`}
            aria-selected={i === index}
            aria-controls={`hero-panel-${s.id}`}
            tabIndex={i === index ? 0 : -1}
            onClick={() => select(i)}
            className={`min-h-[44px] shrink-0 snap-start rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              i === index
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {lt(lang, s.tab)}
          </button>
        ))}
      </div>

      <div className="relative w-full min-w-0">
        <div
          role="tabpanel"
          id={`hero-panel-${HERO_SLIDES[index].id}`}
          aria-labelledby={`hero-tab-${HERO_SLIDES[index].id}`}
          aria-busy={loading}
          aria-live="polite"
          className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="flex h-6 items-center gap-1.5 border-b border-border pl-3">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
          </div>
          <div className="relative aspect-video w-full min-w-0 overflow-hidden bg-muted/40">
            <img
              src={active.image}
              alt={lt(lang, active.alt)}
              loading="eager"
              decoding="async"
              className="hero-slide-media block h-full w-full object-contain"
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-[1px] motion-safe:animate-pulse">
                <span className="h-2/3 w-4/5 rounded-xl bg-muted" />
              </div>
            )}
          </div>
        </div>

        {/* Arrows overlay the left/right edges of the screenshot */}
        <button
          type="button"
          aria-label={lt(lang, "heroPrev")}
          onClick={() => select(index - 1)}
          disabled={index === 0}
          className="absolute left-1 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 sm:left-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label={lt(lang, "heroNext")}
          onClick={() => select(index + 1)}
          disabled={index === last}
          className="absolute right-1 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 sm:right-2"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Non-interactive progress indicator + counter */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {HERO_SLIDES.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2.5 bg-border"}`}
            />
          ))}
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {String(index + 1).padStart(2, "0")} / {String(HERO_SLIDES.length).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

export default HeroCarousel;
