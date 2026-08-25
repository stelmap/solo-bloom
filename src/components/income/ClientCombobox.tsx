import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  clients: any[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
}

export function ClientCombobox({ clients, value, onChange, placeholder, searchPlaceholder, emptyLabel }: Props) {
  const [open, setOpen] = useState(false);
  const active = useMemo(
    () => (clients || []).filter((c: any) => c.status !== "archived"),
    [clients],
  );
  const selected = active.find((c: any) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-10 font-normal", !selected && "text-muted-foreground")}
        >
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="start">
        <Command
          filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {active.map((c: any) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.email || ""} ${c.phone || ""}`}
                  onSelect={() => { onChange(c.id); setOpen(false); }}
                  className="gap-2"
                >
                  <Check className={cn("h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{c.name}</span>
                    {c.email && <span className="block text-xs text-muted-foreground truncate">{c.email}</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
