import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sidebar.pinned";
const EVENT = "sidebar-pinned-change";

export const SIDEBAR_RAIL_WIDTH = 68;
export const SIDEBAR_PANEL_WIDTH = 216;

function readPinned(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Whether the user pinned the sidebar open. Persisted in localStorage so the
 * choice survives navigation, reloads and re-login, and shared across
 * components through a window event.
 */
export function useSidebarPinned(): [boolean, (v: boolean) => void] {
  const [pinned, setPinnedState] = useState<boolean>(() => readPinned());

  useEffect(() => {
    const sync = () => setPinnedState(readPinned());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setPinned = useCallback((v: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      /* noop */
    }
    setPinnedState(v);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [pinned, setPinned];
}
