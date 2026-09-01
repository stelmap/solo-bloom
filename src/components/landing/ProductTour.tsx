import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { AppLanguage } from "@/i18n/translations";
import { lt, type LandingCopyKey } from "@/lib/landingRedesignCopy";
import { track } from "@/lib/analytics";
import { landingEventProps } from "@/lib/landingCampaign";
import calendarAsset from "@/assets/landing-calendar.png.asset.json";
import dashboardAsset from "@/assets/landing-dashboard.png.asset.json";
import clientAsset from "@/assets/landing-client.png.asset.json";
import financesAsset from "@/assets/landing-finances.png.asset.json";

interface Slide {
  id: string;
  label: LandingCopyKey;
  title: LandingCopyKey;
  body: LandingCopyKey;
  alt: LandingCopyKey;
  image: string;
}

const SLIDES: Slide[] = [
  { id: "calendar", label: "tabCalendar", title: "tabCalendarTitle", body: "tabCalendarBody", alt: "altCalendar", image: calendarAsset.url },
  { id: "today", label: "tabToday", title: "tabTodayTitle", body: "tabTodayBody", alt: "altDashboard", image: dashboardAsset.url },
  { id: "clients", label: "tabClients", title: "tabClientsTitle", body: "tabClientsBody", alt: "altClient", image: clientAsset.url },
  { id: "finance", label: "tabFinance", title: "tabFinanceTitle", body: "tabFinanceBody", alt: "altFinance", image: financesAsset.url },
];

/** Interactive product tour with accessible tablist semantics + keyboard nav. */
export function ProductTour({ lang }: { lang: AppLanguage }) {
  const [index, setIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = SLIDES[index];

  const select = (next: number) => {
    setIndex(next);
    track("hero_product_tab_click", landingEventProps({ locale: lang, source_page: "/", tab: SLIDES[next].id }));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = SLIDES.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="product-tour" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">{lt(lang, "tourEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{lt(lang, "tourTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">{lt(lang, "tourText")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <div role="tablist" aria-label={lt(lang, "tourTitle")} aria-orientation="vertical" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.id}
                ref={(el) => (tabRefs.current[i] = el)}
                role="tab"
                id={`tour-tab-${slide.id}`}
                aria-selected={index === i}
                aria-controls={`tour-panel-${slide.id}`}
                tabIndex={index === i ? 0 : -1}
                onClick={() => select(i)}
                onKeyDown={onKeyDown}
                className={`flex min-w-[190px] items-center gap-3 rounded-xl border p-4 text-left transition-colors lg:min-w-0 ${
                  index === i ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/40"
                }`}
              >
                <span className="text-xs font-bold text-primary">0{i + 1}</span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm font-semibold text-foreground">{lt(lang, slide.label)}</strong>
                  <small className="block truncate text-xs text-muted-foreground">{lt(lang, slide.title)}</small>
                </span>
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`tour-panel-${active.id}`}
            aria-labelledby={`tour-tab-${active.id}`}
            tabIndex={0}
            className="min-w-0"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img src={active.image} alt={lt(lang, active.alt)} loading="lazy" className="block w-full" />
            </div>
            <div className="mt-5">
              <h3 className="text-xl font-bold text-foreground">{lt(lang, active.title)}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{lt(lang, active.body)}</p>
              <a href="#workflow" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                {lt(lang, "workflowEyebrow")} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductTour;
