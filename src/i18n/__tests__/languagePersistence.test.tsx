import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  LanguageProvider,
  useLanguage,
  setPreLoginLang,
  getStoredLang,
  getPreLoginLang,
  clearPreLoginLang,
} from "@/i18n/LanguageContext";

// Mock useProfile/useUpdateProfile so the provider works without a real backend.
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
  const { lang, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="signin">{t("auth.signIn")}</span>
    </div>
  );
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
  // Default browser language → English
  Object.defineProperty(navigator, "language", { value: "en-US", configurable: true });
});

describe("Language persistence", () => {
  it("AC1/AC2: pre-login Ukrainian survives navigation to login and after login", async () => {
    setPreLoginLang("uk");
    expect(getPreLoginLang()).toBe("uk");
    expect(getStoredLang()).toBe("uk");

    renderApp();
    // Wait for non-English locale to lazy-load
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(screen.getByTestId("lang").textContent).toBe("uk");

    // Simulate successful login: profile loads with old language "en"
    mockProfile = { language: "en" };
    // Pre-login choice (uk) must win and be persisted to profile
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(updateMock).toHaveBeenCalledWith({ language: "uk" });
  });

  it("AC4: French pre-login choice is applied", async () => {
    setPreLoginLang("fr");
    renderApp();
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(screen.getByTestId("lang").textContent).toBe("fr");
  });

  it("AC5: refresh keeps the selected language (read from storage)", () => {
    setPreLoginLang("pl");
    // Simulate refresh: brand-new render reads from localStorage
    renderApp();
    expect(screen.getByTestId("lang").textContent).toBe("pl");
  });

  it("AC6: browser default does not override explicit choice", async () => {
    Object.defineProperty(navigator, "language", { value: "en-US", configurable: true });
    setPreLoginLang("uk");
    mockProfile = null;
    renderApp();
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(screen.getByTestId("lang").textContent).toBe("uk");
  });

  it("AC7: pre-login flag is cleared once profile catches up", async () => {
    setPreLoginLang("uk");
    mockProfile = { language: "uk" };
    renderApp();
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(getPreLoginLang()).toBeNull();
  });

  it("AC8 (settings change): saved profile language is used when no pre-login override", async () => {
    clearPreLoginLang();
    mockProfile = { language: "fr" };
    renderApp();
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(screen.getByTestId("lang").textContent).toBe("fr");
    expect(localStorage.getItem("app_lang")).toBe("fr");
  });
});
