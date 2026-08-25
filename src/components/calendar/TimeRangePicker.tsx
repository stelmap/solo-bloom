import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sophisticated time-range picker for blocked ("unavailable") time.
 * 15-minute snapped dropdowns, fine ±15 min steppers, duration presets and a
 * live duration readout. Purely presentational — the parent owns the state.
 */
export const toMin = (hhmm: string) => {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const toHHMM = (min: number) => {
  const c = Math.max(0, Math.min(24 * 60, Math.round(min)));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
};

const STEP = 15;

type Copy = {
  start: string; end: string; duration: string; presets: string; wholeDay: string;
  hour: string; minutes: string;
};

const COPY: Record<string, Copy> = {
  en: { start: "Start", end: "End", duration: "Duration", presets: "Quick length", wholeDay: "All day", hour: "h", minutes: "min" },
  uk: { start: "Початок", end: "Кінець", duration: "Тривалість", presets: "Швидкий вибір", wholeDay: "Весь день", hour: "год", minutes: "хв" },
  ru: { start: "Начало", end: "Окончание", duration: "Длительность", presets: "Быстрый выбор", wholeDay: "Весь день", hour: "ч", minutes: "мин" },
  fr: { start: "Début", end: "Fin", duration: "Durée", presets: "Durée rapide", wholeDay: "Journée", hour: "h", minutes: "min" },
  pl: { start: "Początek", end: "Koniec", duration: "Czas trwania", presets: "Szybki wybór", wholeDay: "Cały dzień", hour: "godz", minutes: "min" },
};

interface Props {
  start: string;
  end: string;
  onChange: (next: { start: string; end: string }) => void;
  lang?: string;
  use12h?: boolean;
  className?: string;
}

export function TimeRangePicker({ start, end, onChange, lang = "en", use12h = false, className }: Props) {
  const C = COPY[String(lang).toLowerCase()] || COPY.en;

  const label = (hhmm: string) => {
    if (!use12h) return hhmm;
    const m = toMin(hhmm);
    const h24 = Math.floor(m / 60);
    const suffix = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m % 60).padStart(2, "0")} ${suffix}`;
  };

  const options = useMemo(
    () => Array.from({ length: (24 * 60) / STEP }, (_, i) => toHHMM(i * STEP)),
    [],
  );
  const endOptions = useMemo(
    () => Array.from({ length: (24 * 60) / STEP }, (_, i) => toHHMM((i + 1) * STEP)),
    [],
  );

  const s = toMin(start);
  const e = toMin(end);
  const dur = Math.max(0, e - s);

  const setStart = (value: string) => {
    const ns = toMin(value);
    const next = { start: toHHMM(ns), end: e <= ns ? toHHMM(Math.min(ns + Math.max(dur, STEP), 24 * 60)) : end };
    onChange(next);
  };
  const setEnd = (value: string) => onChange({ start, end: value });

  const nudge = (which: "start" | "end", delta: number) => {
    if (which === "start") setStart(toHHMM(s + delta));
    else onChange({ start, end: toHHMM(Math.max(s + STEP, e + delta)) });
  };

  const applyPreset = (minutes: number | "day") => {
    if (minutes === "day") return onChange({ start: "00:00", end: "24:00" });
    onChange({ start, end: toHHMM(Math.min(s + minutes, 24 * 60)) });
  };

  const durText = dur >= 60
    ? `${Math.floor(dur / 60)} ${C.hour}${dur % 60 ? ` ${dur % 60} ${C.minutes}` : ""}`
    : `${dur} ${C.minutes}`;

  const Field = ({ which }: { which: "start" | "end" }) => {
    const value = which === "start" ? start : end;
    const list = which === "start" ? options : endOptions;
    return (
      <div className="space-y-1 min-w-0">
        <Label className="text-xs whitespace-nowrap">{which === "start" ? C.start : C.end}</Label>
        <div className="flex min-w-0 items-center gap-1">
          <Button
            type="button" variant="outline" size="icon"
            className="h-9 w-9 shrink-0"
            aria-label={`-${STEP} ${C.minutes}`}
            onClick={() => nudge(which, -STEP)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Select value={value} onValueChange={which === "start" ? setStart : setEnd}>
            <SelectTrigger className="h-9 min-w-0 flex-1 px-2 tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {list.map((o) => (
                <SelectItem key={o} value={o} className="tabular-nums">{label(o)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button" variant="outline" size="icon"
            className="h-9 w-9 shrink-0"
            aria-label={`+${STEP} ${C.minutes}`}
            onClick={() => nudge(which, STEP)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-2 min-w-0">
        <Field which="start" />
        <Field which="end" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">{C.presets}</span>
        {[30, 60, 120, 240].map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={dur === m ? "secondary" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => applyPreset(m)}
          >
            {m >= 60 ? `${m / 60} ${C.hour}` : `${m} ${C.minutes}`}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={start === "00:00" && dur === 24 * 60 ? "secondary" : "outline"}
          className="h-7 px-2 text-xs"
          onClick={() => applyPreset("day")}
        >
          {C.wholeDay}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {C.duration}: <span className="font-medium text-foreground">{durText}</span>
      </p>
    </div>
  );
}
