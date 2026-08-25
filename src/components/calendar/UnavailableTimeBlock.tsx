import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ban, Trash2, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

export type BlockedBlock = { id: string; date: string; start: string; end: string };

type Copy = {
  title: string; date: string; start: string; end: string;
  editTime: string; makeAvailable: string; deleteBlock: string;
  save: string; cancel: string; hint: string; invalid: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Unavailable time", date: "Date", start: "Start", end: "End",
    editTime: "Edit time", makeAvailable: "Make available", deleteBlock: "Delete block",
    save: "Save", cancel: "Cancel", hint: "Click to edit or unblock",
    invalid: "End time must be later than start time",
  },
  uk: {
    title: "Недоступний час", date: "Дата", start: "Початок", end: "Кінець",
    editTime: "Змінити час", makeAvailable: "Зробити доступним", deleteBlock: "Видалити блок",
    save: "Зберегти", cancel: "Скасувати", hint: "Натисніть, щоб змінити або розблокувати",
    invalid: "Час завершення має бути пізніше за початок",
  },
  ru: {
    title: "Недоступное время", date: "Дата", start: "Начало", end: "Окончание",
    editTime: "Изменить время", makeAvailable: "Сделать доступным", deleteBlock: "Удалить блок",
    save: "Сохранить", cancel: "Отмена", hint: "Нажмите, чтобы изменить или разблокировать",
    invalid: "Время окончания должно быть позже начала",
  },
  fr: {
    title: "Période bloquée", date: "Date", start: "Début", end: "Fin",
    editTime: "Modifier l'horaire", makeAvailable: "Rendre disponible", deleteBlock: "Supprimer",
    save: "Enregistrer", cancel: "Annuler", hint: "Cliquez pour modifier ou débloquer",
    invalid: "L'heure de fin doit être postérieure au début",
  },
  pl: {
    title: "Czas niedostępny", date: "Data", start: "Początek", end: "Koniec",
    editTime: "Zmień godziny", makeAvailable: "Udostępnij", deleteBlock: "Usuń blokadę",
    save: "Zapisz", cancel: "Anuluj", hint: "Kliknij, aby edytować lub odblokować",
    invalid: "Godzina zakończenia musi być późniejsza niż początek",
  },
};

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toHHMM = (min: number) => {
  const c = Math.max(0, Math.min(24 * 60, min));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
};
const SNAP = 15;

interface Props {
  block: BlockedBlock;
  /** Pixel height of one hour row */
  rowHeight: number;
  /** Hour of the cell this block is rendered in */
  cellHour: number;
  onSave: (id: string, next: { date: string; start: string; end: string }) => Promise<boolean>;
  onUnblock: (block: BlockedBlock) => void;
  onDelete: (block: BlockedBlock) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

export function UnavailableTimeBlock({
  block, rowHeight, cellHour, onSave, onUnblock, onDelete, onDragStateChange,
}: Props) {
  const { lang } = useLanguage();
  const C = COPY[lang as string] || COPY.en;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(block);
  const [error, setError] = useState<string | null>(null);
  const [resize, setResize] = useState<null | { edge: "top" | "bottom"; start: string; end: string }>(null);
  const resizeRef = useRef<{ edge: "top" | "bottom"; originY: number; start: number; end: number } | null>(null);

  useEffect(() => { if (!open) { setEditing(false); setDraft(block); setError(null); } }, [open, block]);

  const startMin = toMin(resize?.start ?? block.start);
  const endMin = toMin(resize?.end ?? block.end);
  const top = ((startMin - cellHour * 60) / 60) * rowHeight;
  const height = Math.max(((endMin - startMin) / 60) * rowHeight - 2, 16);

  // --- resize (pointer) ---
  useEffect(() => {
    if (!resizeRef.current) return;
    const onMove = (e: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const deltaMin = Math.round(((e.clientY - r.originY) / rowHeight) * 60 / SNAP) * SNAP;
      if (r.edge === "top") {
        const ns = Math.min(r.start + deltaMin, r.end - SNAP);
        setResize({ edge: "top", start: toHHMM(ns), end: toHHMM(r.end) });
      } else {
        const ne = Math.max(r.end + deltaMin, r.start + SNAP);
        setResize({ edge: "bottom", start: toHHMM(r.start), end: toHHMM(ne) });
      }
    };
    const onUp = async () => {
      const r = resizeRef.current;
      resizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setResize(prev => {
        if (prev && r) {
          void onSave(block.id, { date: block.date, start: prev.start, end: prev.end });
        }
        return null;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resize !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const beginResize = (edge: "top" | "bottom") => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { edge, originY: e.clientY, start: toMin(block.start), end: toMin(block.end) };
    setResize({ edge, start: block.start, end: block.end });
  };

  const submit = async () => {
    if (toMin(draft.end) <= toMin(draft.start)) { setError(C.invalid); return; }
    const ok = await onSave(block.id, { date: draft.date, start: draft.start, end: draft.end });
    if (ok) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          draggable={!resize}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("text/plain", `block:${block.id}`);
            e.dataTransfer.effectAllowed = "move";
            onDragStateChange?.(true);
          }}
          onDragEnd={() => onDragStateChange?.(false)}
          onClick={(e) => e.stopPropagation()}
          title={C.hint}
          role="button"
          tabIndex={0}
          className={cn(
            "group/blk absolute left-1 right-1 z-[15] rounded-md border px-1.5 py-0.5 overflow-hidden",
            "bg-destructive/10 border-destructive/25 text-destructive cursor-pointer",
            "hover:bg-destructive/15 hover:border-destructive/40 transition-colors",
            "cursor-grab active:cursor-grabbing",
            open && "ring-2 ring-destructive/50 border-destructive/60",
          )}
          style={{ top: `${top}px`, height: `${height}px` }}
        >
          <div
            onPointerDown={beginResize("top")}
            className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize opacity-0 group-hover/blk:opacity-100 bg-destructive/40 rounded-t"
          />
          <div className="flex items-center gap-1 min-w-0">
            <Ban className="h-3 w-3 shrink-0 opacity-70" />
            <span className="text-[11px] font-medium truncate">{C.title}</span>
          </div>
          {height >= 32 && (
            <p className="text-[10px] opacity-75 truncate">
              {(resize?.start ?? block.start)}–{(resize?.end ?? block.end)}
            </p>
          )}
          <div
            onPointerDown={beginResize("bottom")}
            className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 group-hover/blk:opacity-100 bg-destructive/40 rounded-b"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          <p className="font-semibold text-sm">{C.title}</p>
        </div>

        {!editing ? (
          <div className="text-sm text-muted-foreground">
            <p>{block.date}</p>
            <p className="font-medium text-foreground">{block.start} – {block.end}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">{C.date}</Label>
              <Input type="date" value={draft.date} onChange={(e) => setDraft(d => ({ ...d, date: e.target.value }))} className="h-9" />
            </div>
            <TimeRangePicker
              start={draft.start}
              end={draft.end}
              lang={language}
              onChange={({ start, end }) => setDraft(d => ({ ...d, start, end }))}
            />

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {!editing ? (
            <Button variant="outline" size="sm" className="justify-start" onClick={() => setEditing(true)}>
              {C.editTime}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={submit}>{C.save}</Button>
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setEditing(false); setDraft(block); setError(null); }}>{C.cancel}</Button>
            </div>
          )}
          <Button variant="outline" size="sm" className="justify-start" onClick={() => { setOpen(false); onUnblock(block); }}>
            <CalendarCheck className="h-4 w-4 mr-2" /> {C.makeAvailable}
          </Button>
          <Button variant="ghost" size="sm" className="justify-start text-destructive hover:text-destructive" onClick={() => { setOpen(false); onDelete(block); }}>
            <Trash2 className="h-4 w-4 mr-2" /> {C.deleteBlock}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
