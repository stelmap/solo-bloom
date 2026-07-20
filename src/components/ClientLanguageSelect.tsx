import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CLIENT_LANGUAGES, type ClientLanguage } from "@/lib/clientLanguage";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props {
  value: ClientLanguage | "";
  onChange: (v: ClientLanguage) => void;
  required?: boolean;
  showHelp?: boolean;
  id?: string;
}

export function ClientLanguageSelect({ value, onChange, required, showHelp = true, id }: Props) {
  const { t } = useLanguage();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {t("clientLang.label")} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={value || undefined} onValueChange={(v) => onChange(v as ClientLanguage)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={t("clientLang.select")} />
        </SelectTrigger>
        <SelectContent>
          {CLIENT_LANGUAGES.map((code) => (
            <SelectItem key={code} value={code}>
              {t(`clientLang.option.${code}` as any)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showHelp && <p className="text-xs text-muted-foreground">{t("clientLang.help")}</p>}
    </div>
  );
}
