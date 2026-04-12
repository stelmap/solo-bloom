import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  use12h?: boolean;
  interval?: number; // minutes between slots, default 15
  className?: string;
}

export function TimePicker({ value, onChange, use12h = false, interval = 15, className }: TimePickerProps) {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += interval) {
      slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }

  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [value]);

  const formatSlot = (slot: string) => {
    if (!use12h) return slot;
    const [h, m] = slot.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <ScrollArea className={cn("h-[200px] rounded-md border border-border bg-popover", className)}>
      <div className="p-1 space-y-0.5">
        {slots.map(slot => {
          const isSelected = slot === value;
          return (
            <button
              key={slot}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onChange(slot)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {formatSlot(slot)}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
