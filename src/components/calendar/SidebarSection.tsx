import { ReactNode, useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "calendar.sidebar.sections";

function readState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeState(id: string, open: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), [id]: open }));
  } catch {
    /* ignore */
  }
}

type Props = {
  id: string;
  title: string;
  /** Small counter / status shown next to the title (also visible when collapsed). */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

/** Collapsible section of the Calendar right sidebar; remembers its state. */
export function SidebarSection({ id, title, meta, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState<boolean>(() => {
    const saved = readState()[id];
    return typeof saved === "boolean" ? saved : defaultOpen;
  });

  useEffect(() => {
    const saved = readState()[id];
    if (typeof saved === "boolean") setOpen(saved);
  }, [id]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      writeState(id, !prev);
      return !prev;
    });
  }, [id]);

  return (
    <section>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 min-h-[48px] text-left hover:bg-accent/40 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {meta != null && <span className="text-xs text-muted-foreground truncate">{meta}</span>}
        <ChevronDown
          className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
