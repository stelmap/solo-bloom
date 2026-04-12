import { useState } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";

interface DateTimePickerProps {
  date: string; // "yyyy-MM-dd"
  time: string; // "HH:mm"
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  use12h?: boolean;
  dateLabel?: string;
  timeLabel?: string;
  className?: string;
}

export function DateTimePicker({
  date, time, onDateChange, onTimeChange,
  use12h = false, dateLabel = "Date", timeLabel = "Time", className,
}: DateTimePickerProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const selectedDate = date ? parse(date, "yyyy-MM-dd", new Date()) : undefined;

  const formatTimeDisplay = (t: string) => {
    if (!t) return "";
    if (!use12h) return t;
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {/* Date picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{dateLabel} *</label>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-10",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {date ? format(selectedDate!, "MMM d, yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  onDateChange(format(d, "yyyy-MM-dd"));
                  setDateOpen(false);
                }
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{timeLabel} *</label>
        <Popover open={timeOpen} onOpenChange={setTimeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-10",
                !time && "text-muted-foreground"
              )}
            >
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              {time ? formatTimeDisplay(time) : "Pick a time"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-0" align="start">
            <TimePicker
              value={time}
              onChange={(t) => {
                onTimeChange(t);
                setTimeOpen(false);
              }}
              use12h={use12h}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/** Standalone date-only picker for use in recurring end date, etc. */
interface DatePickerProps {
  date: string; // "yyyy-MM-dd"
  onDateChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ date, onDateChange, label, placeholder = "Pick a date", className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = date ? parse(date, "yyyy-MM-dd", new Date()) : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {date ? format(selectedDate!, "MMM d, yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              if (d) {
                onDateChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
