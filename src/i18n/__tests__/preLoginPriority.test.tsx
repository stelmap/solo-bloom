import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import {
  LanguageProvider,
  useLanguage,
  setPreLoginLang,
} from "@/i18n/LanguageContext";

let mockProfile: { language?: string } | null = null;
const updateMock = vi.fn();
vi.mock("@/hooks/useData", () => ({
  useProfile: () => ({ data: mockProfile }),
  useUpdateProfile: () => ({
    mutate: (vars: any) => {
      updateMock(vars);
      mockProfile = { ...(mockProfile ?? {}), ...vars };
    },
    isPending: false,
  }),
}));

function Probe() {
  const { lang } = useLanguage();
  return <span data-testid="lang">{lang}</span>;
}
const renderApp = () =>
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });

beforeEach(() => {
  localStorage.clear();
  mockProfile = null;
  updateMock.mockClear();
  cleanup();
});

describe("preLoginLang priority during auth redirects", () => {
  it("wins over browser default (de-DE)", async () => {
    Object.defineProperty(navigator, "language", { value: "de-DE", configurable: true });
    setPreLoginLang("uk");
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("uk");
  });

  it("wins over cached app_lang from a previous session", async () => {
    // Simulate stale cached preference from a different user/session
    localStorage.setItem("app_lang", "en");
    localStorage.setItem("landing_lang", "en");
    setPreLoginLang("fr"); // overwrites both + sets pre_login_lang
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("fr");
  });

  it("wins over stale profile language returned right after login", async () => {
    setPreLoginLang("uk");
    // Login resolves and profile arrives with old language
    mockProfile = { language: "en" };
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("uk");
    expect(updateMock).toHaveBeenCalledWith({ language: "uk" });
  });

  it("survives a redirect chain: landing → /auth → /dashboard (re-mount sequence)", async () => {
    setPreLoginLang("fr");

    // Mount #1: landing
    let view = renderApp();
    await flush();
    expect(view.getByTestId("lang").textContent).toBe("fr");
    view.unmount();

    // Mount #2: /auth (no profile yet)
    view = renderApp();
    await flush();
    expect(view.getByTestId("lang").textContent).toBe("fr");
    view.unmount();

    // Mount #3: /dashboard (profile loaded, stale lang)
    mockProfile = { language: "en" };
    view = renderApp();
    await flush();
    expect(view.getByTestId("lang").textContent).toBe("fr");
  });

  it("survives a hard refresh (fresh provider reads localStorage)", async () => {
    setPreLoginLang("pl");
    const view = renderApp();
    await flush();
    expect(view.getByTestId("lang").textContent).toBe("pl");
    view.unmount();
    cleanup();

    // "Refresh": brand-new render, localStorage retains values
    const fresh = renderApp();
    expect(fresh.getByTestId("lang").textContent).toBe("pl");
  });

  it("multi-tab: storage event from another tab updates this tab's language", async () => {
    setPreLoginLang("en");
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("en");

    // Another tab changes language → fires `storage` event in this tab
    await act(async () => {
      localStorage.setItem("app_lang", "uk");
      localStorage.setItem("landing_lang", "uk");
      localStorage.setItem("pre_login_lang", "uk");
      window.dispatchEvent(new StorageEvent("storage", { key: "app_lang", newValue: "uk" }));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(screen.getByTestId("lang").textContent).toBe("uk");
  });

  it("multi-tab: in-tab `app_lang_change` event propagates to listeners", async () => {
    setPreLoginLang("en");
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("en");

    await act(async () => {
      // Simulate setStoredLang() from another component
      localStorage.setItem("app_lang", "fr");
      localStorage.setItem("landing_lang", "fr");
      localStorage.setItem("pre_login_lang", "fr");
      window.dispatchEvent(new CustomEvent("app_lang_change", { detail: "fr" }));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(screen.getByTestId("lang").textContent).toBe("fr");
  });
});
