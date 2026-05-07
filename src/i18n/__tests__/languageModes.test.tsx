import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  LanguageProvider,
  useLanguage,
  setPreLoginLang,
  clearPreLoginLang,
} from "@/i18n/LanguageContext";

// Mock useProfile/useUpdateProfile — we vary `mockProfile` per scenario to
// emulate demo (no profile), trial, free, and paid users.
let mockProfile: { language?: string; subscription_tier?: string } | null = null;
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

function renderApp() {
  return render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mockProfile = null;
  updateMock.mockClear();
  // Browser default English — we want to prove it never wins over the user's choice.
  Object.defineProperty(navigator, "language", { value: "en-US", configurable: true });
});

async function flush() {
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
}

describe("Language persistence across subscription modes", () => {
  it("Demo mode (no profile, no auth): selected language persists", async () => {
    setPreLoginLang("uk");
    mockProfile = null; // demo: not authenticated
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("uk");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("Trial mode: pre-login choice wins over stale profile language and is saved", async () => {
    setPreLoginLang("uk");
    mockProfile = { language: "en", subscription_tier: "trial" };
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("uk");
    expect(updateMock).toHaveBeenCalledWith({ language: "uk" });
  });

  it("Free mode (no subscription): selected language persists, no reset to browser default", async () => {
    setPreLoginLang("fr");
    mockProfile = { language: "en", subscription_tier: null as any };
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("fr");
    expect(updateMock).toHaveBeenCalledWith({ language: "fr" });
  });

  it("Paid mode: selected language persists and overrides previous profile language", async () => {
    setPreLoginLang("pl");
    mockProfile = { language: "en", subscription_tier: "pro" };
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("pl");
    expect(updateMock).toHaveBeenCalledWith({ language: "pl" });
  });

  it("Paid mode without pre-login override: profile language is honored, not browser default", async () => {
    clearPreLoginLang();
    mockProfile = { language: "uk", subscription_tier: "pro" };
    renderApp();
    await flush();
    expect(screen.getByTestId("lang").textContent).toBe("uk");
    expect(localStorage.getItem("app_lang")).toBe("uk");
  });

  it("Trial mode refresh: language survives reload via localStorage", async () => {
    setPreLoginLang("fr");
    mockProfile = { language: "fr", subscription_tier: "trial" };
    renderApp();
    await flush();
    // Simulate refresh: unmount + new render with same localStorage
    const fresh = render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(fresh.getAllByTestId("lang")[0].textContent).toBe("fr");
  });
});
