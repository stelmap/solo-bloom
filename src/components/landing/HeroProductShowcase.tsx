import { Bell, Users } from "lucide-react";
import type { AppLanguage } from "@/i18n/translations";
import { lt } from "@/lib/landingRedesignCopy";
import calendarAsset from "@/assets/landing-calendar.png.asset.json";
import clientAsset from "@/assets/landing-client.png.asset.json";
import financesAsset from "@/assets/landing-finances.png.asset.json";

/** Stacked real product screens shown next to the hero copy. */
export function HeroProductShowcase({ lang }: { lang: AppLanguage }) {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="pointer-events-none absolute left-[8%] top-0 hidden w-[46%] overflow-hidden rounded-xl border border-border bg-card opacity-90 shadow-lg lg:block">
        <img src={clientAsset.url} alt={lt(lang, "altClient")} loading="lazy" className="block w-full" />
      </div>
      <div className="pointer-events-none absolute right-0 top-0 hidden w-[42%] overflow-hidden rounded-xl border border-border bg-card opacity-90 shadow-lg lg:block">
        <img src={financesAsset.url} alt={lt(lang, "altFinance")} loading="lazy" className="block w-full" />
      </div>

      <div className="relative z-10 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:mt-24">
        <div className="flex h-6 items-center gap-1.5 border-b border-border pl-3">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
        </div>
        <img
          src={calendarAsset.url}
          alt={lt(lang, "altCalendar")}
          width={1440}
          height={900}
          className="block w-full"
        />
      </div>

      <div className="pointer-events-none absolute -left-2 top-[18%] z-20 hidden max-w-[190px] items-start gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg xl:flex">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {lt(lang, "heroAnnotation1")}
      </div>
      <div className="pointer-events-none absolute -right-2 bottom-[10%] z-20 hidden max-w-[200px] items-start gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg xl:flex">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {lt(lang, "heroAnnotation2")}
      </div>
    </div>
  );
}

export default HeroProductShowcase;
