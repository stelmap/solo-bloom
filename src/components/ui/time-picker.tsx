import { useRef, useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  use12h?: boolean;
  interval?: number; // minutes between slots, default 15
  className?: string;
  /** Called when the user presses Escape */
  onClose?: () => void;
  /** Slots strictly before this "HH:mm" are disabled */
  minTime?: string;
}

export function TimePicker({
  value,
  onChange,
  use12h = false,
  interval = 15,
  className,
  onClose,
  minTime,
}: TimePickerProps) {
  const slots = useMemo(() => {
    const out: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += interval) {
        out.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
      }
    }
    return out;
  }, [interval]);

  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(() => {
    const i = slots.indexOf(value);
    return i >= 0 ? i : 0;
  });

  // Scroll the selected option into view *inside the list only* (never scroll
  // ancestors like the modal or the calendar behind it).
  useEffect(() => {
    const list = listRef.current;
    const el = selectedRef.current;
    if (!list || !el) return;
    list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
    // focus the list so arrow keys work immediately
    list.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollIndexIntoView = (idx: number) => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelectorAll<HTMLButtonElement>("button[data-slot-btn]")[idx];
    if (!el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  };

  const isDisabled = (slot: string) => (minTime ? slot <= minTime : false);

  const move = (dir: 1 | -1) => {
    setActiveIndex(prev => {
      let next = prev;
      for (let i = 0; i < slots.length; i++) {
        next = Math.min(slots.length - 1, Math.max(0, next + dir));
        if (!isDisabled(slots[next])) break;
        if (next === 0 || next === slots.length - 1) break;
      }
      scrollIndexIntoView(next);
      return next;
    });
  };

  const formatSlot = (slot: string) => {
    if (!use12h) return slot;
    const [h, m] = slot.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div
      ref={listRef}
      role="listbox"
      tabIndex={0}
      aria-label="Time"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const slot = slots[activeIndex];
          if (slot && !isDisabled(slot)) onChange(slot);
        } else if (e.key === "Escape") { e.preventDefault(); onClose?.(); }
      }}
      onWheel={(e) => { e.stopPropagation(); }}
      className={cn(
        "h-[220px] w-full overflow-y-auto overscroll-contain rounded-md border border-border bg-popover outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="p-1 space-y-0.5">
        {slots.map((slot, i) => {
          const isSelected = slot === value;
          const disabled = isDisabled(slot);
          return (
            <button
              key={slot}
              type="button"
              data-slot-btn=""
              role="option"
              aria-selected={isSelected}
              disabled={disabled}
              ref={isSelected ? selectedRef : undefined}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => onChange(slot)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                disabled && "opacity-40 cursor-not-allowed",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : cn("text-foreground", !disabled && "hover:bg-muted", i === activeIndex && !disabled && "bg-muted"),
              )}
            >
              {formatSlot(slot)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
