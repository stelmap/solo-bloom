import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";

interface ClientPickerProps {
  clients: any[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Optional extra item rendered at top, e.g. {value:"all", label:"All clients"} */
  allOption?: { value: string; label: string };
  triggerClassName?: string;
  /** When true, the selected client is forced visible even if archived & toggle off */
  alwaysShowSelected?: boolean;
}

/**
 * Client selector that hides archived clients by default but lets the user
 * opt in via an "Include archived" checkbox.
 */
export function ClientPicker({
  clients,
  value,
  onChange,
  placeholder,
  allOption,
  triggerClassName,
  alwaysShowSelected = true,
}: ClientPickerProps) {
  const { t } = useLanguage();
  const selected = clients.find((c: any) => c.id === value);
  const selectedIsArchived = selected?.status === "archived";
  const [includeArchived, setIncludeArchived] = useState<boolean>(selectedIsArchived);

  const visible = useMemo(() => {
    return clients.filter((c: any) => {
      const archived = c.status === "archived";
      if (!archived) return true;
      if (includeArchived) return true;
      if (alwaysShowSelected && c.id === value) return true;
      return false;
    });
  }, [clients, includeArchived, value, alwaysShowSelected]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={triggerClassName}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {allOption && <SelectItem value={allOption.value}>{allOption.label}</SelectItem>}
        {visible.map((c: any) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
            {c.status === "archived" && (
              <span className="text-muted-foreground"> · {t("archive.badge")}</span>
            )}
          </SelectItem>
        ))}
        <div
          className="mt-1 border-t pt-2 px-2 pb-1 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setIncludeArchived(!includeArchived); }}
        >
          <Checkbox
            checked={includeArchived}
            onCheckedChange={(v) => setIncludeArchived(!!v)}
          />
          <span>{t("archive.includeArchived")}</span>
        </div>
      </SelectContent>
    </Select>
  );
}
