import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { MEETING_DURATION_PRESETS, parseMeetingDuration } from "@/lib/meetingDuration";

const COPY: Record<string, { custom: string; invalid: string }> = {
  uk: { custom: "Інша тривалість", invalid: "Введіть цілу кількість хвилин від 1." },
  en: { custom: "Other duration", invalid: "Enter a whole number of minutes, at least 1." },
  ru: { custom: "Другая длительность", invalid: "Введите целое количество минут от 1." },
  pl: { custom: "Inny czas trwania", invalid: "Wpisz całkowitą liczbę minut, co najmniej 1." },
  fr: { custom: "Autre durée", invalid: "Saisissez un nombre entier de minutes, au moins 1." },
};

export function MeetingDurationInput({ value, onChange, id }: { value: string; onChange: (value: string) => void; id: string }) {
  const { t, lang } = useLanguage();
  const copy = COPY[lang] ?? COPY.uk;
  const duration = parseMeetingDuration(value);
  return (
    <div className="space-y-2">
      <Label>{t("common.duration")}</Label>
      <div role="group" aria-label={t("common.duration")} className="flex flex-wrap gap-2">
        {MEETING_DURATION_PRESETS.map(minutes => (
          <Button key={minutes} type="button" variant={duration === minutes ? "default" : "outline"}
            aria-pressed={duration === minutes} onClick={() => onChange(String(minutes))}
            className="h-9 whitespace-nowrap px-3">
            {minutes} {t("common.min")}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{copy.custom}</Label>
        <Input id={id} type="number" inputMode="numeric" min={1} step={1} required
          value={value} onChange={event => { event.currentTarget.setCustomValidity(""); onChange(event.target.value); }}
          onBlur={event => event.currentTarget.setCustomValidity(duration === null ? copy.invalid : "")}
          className="w-24" />
        <span className="text-sm text-muted-foreground">{t("common.min")}</span>
      </div>
    </div>
  );
}