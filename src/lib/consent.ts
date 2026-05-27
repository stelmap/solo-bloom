// Cookie / tracking consent manager (GDPR).
//
// Tracking scripts (Meta Pixel, Plerdy) must NOT load until the user grants
// explicit "marketing" consent. Strictly-necessary cookies (auth, language)
// are always allowed and do not require consent.

const STORAGE_KEY = "cookie_consent_v1";
const CHANGE_EVENT = "cookie_consent_change";

export type Consent = {
  necessary: true; // always granted
  analytics: boolean;
  marketing: boolean;
  decidedAt: string; // ISO date
};

const DEFAULT: Consent = {
  necessary: true,
  analytics: false,
  marketing: false,
  decidedAt: "",
};

export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    return {
      necessary: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      decidedAt: parsed.decidedAt || "",
    };
  } catch {
    return null;
  }
}

export function setConsent(next: Omit<Consent, "necessary" | "decidedAt">) {
  const value: Consent = {
    ...DEFAULT,
    ...next,
    necessary: true,
    decidedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }));
  } catch {}
  applyConsent(value);
}

export function resetConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: null }));
  } catch {}
}

export function onConsentChange(cb: (c: Consent | null) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent).detail as Consent | null);
  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  return () => window.removeEventListener(CHANGE_EVENT, handler as EventListener);
}

// ── Script loaders (only run on consent) ─────────────────────────────

let pixelLoaded = false;
let plerdyLoaded = false;

function loadMetaPixel() {
  if (pixelLoaded) return;
  if (typeof window === "undefined") return;
  pixelLoaded = true;
  // Standard Facebook Pixel snippet, loaded only after marketing consent.
  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    let n: any, t: HTMLScriptElement, s: HTMLScriptElement | null;
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0] as HTMLScriptElement;
    s?.parentNode?.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  // @ts-ignore
  window.fbq("init", "2059708747919020");
  // @ts-ignore
  window.fbq("track", "PageView");
  /* eslint-enable */
}

function loadPlerdy() {
  if (plerdyLoaded) return;
  if (typeof window === "undefined") return;
  plerdyLoaded = true;
  // @ts-ignore
  window._site_hash_code = "3450f58221ecff5c47954f42faec50a7";
  // @ts-ignore
  window._suid = 76008;
  const s = document.createElement("script");
  s.defer = true;
  s.setAttribute("data-plerdymainscript", "plerdymainscript");
  s.src = "https://a.plerdy.com/public/js/click/main.js?v=" + Math.random();
  document.head.appendChild(s);
}

export function applyConsent(c: Consent | null) {
  if (!c) return;
  if (c.marketing) loadMetaPixel();
  if (c.analytics) loadPlerdy();
}

/** Call once at app boot to re-apply a previously stored consent. */
export function bootConsent() {
  const c = getConsent();
  if (c) applyConsent(c);
}
