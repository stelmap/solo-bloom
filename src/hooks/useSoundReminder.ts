import { useEffect, useRef } from "react";
import { useAppointments } from "./useData";

const STORAGE_KEY = "soundReminder";

export type SoundReminderSettings = {
  enabled: boolean;
  minutesBefore: number;
};

export const DEFAULT_SOUND_REMINDER: SoundReminderSettings = {
  enabled: false,
  minutesBefore: 5,
};

export function readSoundReminder(): SoundReminderSettings {
  if (typeof window === "undefined") return DEFAULT_SOUND_REMINDER;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SOUND_REMINDER;
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      minutesBefore: Number(parsed.minutesBefore) || 5,
    };
  } catch {
    return DEFAULT_SOUND_REMINDER;
  }
}

export function writeSoundReminder(s: SoundReminderSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("sound-reminder-change"));
  } catch {
    /* ignore */
  }
}

function playBeep() {
  try {
    const Ctx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    playTone(880, 0, 0.25);
    playTone(1100, 0.3, 0.35);
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* ignore */
  }
}

/** Mounts once at app level. Polls upcoming appointments and beeps N minutes before start. */
export function useSoundReminder() {
  const { data: appointments = [] } = useAppointments();
  const settingsRef = useRef<SoundReminderSettings>(readSoundReminder());
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => {
      settingsRef.current = readSoundReminder();
    };
    sync();
    window.addEventListener("sound-reminder-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sound-reminder-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const { enabled, minutesBefore } = settingsRef.current;
      if (!enabled) return;
      const now = Date.now();
      const windowMs = 30_000; // fire if we're within 30s of the trigger time
      for (const apt of appointments as any[]) {
        if (!apt?.scheduled_at || apt.status !== "scheduled") continue;
        const start = new Date(apt.scheduled_at).getTime();
        const triggerAt = start - minutesBefore * 60_000;
        const key = `${apt.id}:${minutesBefore}`;
        if (firedRef.current.has(key)) continue;
        if (now >= triggerAt && now <= triggerAt + windowMs && start > now) {
          firedRef.current.add(key);
          playBeep();
        }
      }
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [appointments]);
}
