import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
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
  /** Optional handler to open an "Add new client" flow from the empty / footer state. */
  onAddNew?: () => void;
  addNewLabel?: string;
}

/**
 * Searchable client selector.
 * Matches against name, email and phone (case-insensitive, partial).
 * Hides archived clients by default but lets the user opt in.
 */
export function ClientPicker({
  clients,
  value,
  onChange,
  placeholder,
  allOption,
  triggerClassName,
  alwaysShowSelected = true,
  onAddNew,
  addNewLabel,
}: ClientPickerProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = clients.find((c: any) => c.id === value);
  const selectedIsArchived = selected?.status === "archived";
  const [includeArchived, setIncludeArchived] = useState<boolean>(selectedIsArchived);

  useEffect(() => {
    if (selectedIsArchived) setIncludeArchived(true);
  }, [selectedIsArchived]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c: any) => {
      const archived = c.status === "archived";
      if (archived && !includeArchived && !(alwaysShowSelected && c.id === value)) return false;
      if (!q) return true;
      const haystack = [c.name, c.email, c.phone].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, includeArchived, value, alwaysShowSelected, query]);

  const triggerLabel = selected
    ? selected.name + (selected.status === "archived" ? ` · ${t("archive.badge")}` : "")
    : allOption && value === allOption.value
      ? allOption.label
      : placeholder || t("calendar.selectClient");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal",
            !selected && !(allOption && value === allOption.value) && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] min-w-[260px]"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("common.search") || "Search…"}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-2 text-sm text-muted-foreground">
                <span>{t("clients.noResults") || "No clients found"}</span>
                {onAddNew && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setOpen(false);
                      onAddNew();
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {addNewLabel || t("calendar.addNewClient") || "Add new client"}
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {allOption && (
                <CommandItem
                  value={`__all__${allOption.label}`}
                  onSelect={() => {
                    onChange(allOption.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === allOption.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {allOption.label}
                </CommandItem>
              )}
              {visible.map((c: any) => {
                const sub = [c.email, c.phone].filter(Boolean).join(" · ");
                return (
                  <CommandItem
                    key={c.id}
                    value={`${c.id} ${c.name} ${c.email || ""} ${c.phone || ""}`}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === c.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">
                        {c.name}
                        {c.status === "archived" && (
                          <span className="text-muted-foreground"> · {t("archive.badge")}</span>
                        )}
                      </span>
                      {sub && (
                        <span className="text-xs text-muted-foreground truncate">{sub}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <div
              className="px-2 py-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setIncludeArchived(!includeArchived);
              }}
            >
              <Checkbox
                checked={includeArchived}
                onCheckedChange={(v) => setIncludeArchived(!!v)}
              />
              <span>{t("archive.includeArchived")}</span>
            </div>
            {onAddNew && (
              <div className="border-t p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setOpen(false);
                    onAddNew();
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {addNewLabel || t("calendar.addNewClient") || "Add new client"}
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
