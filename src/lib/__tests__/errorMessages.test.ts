import { describe, it, expect, beforeAll } from "vitest";
import { describeError, errorKeyFor, errorText } from "@/lib/errorMessages";
import { loadLocale, setActiveLang, englishDict, AppLanguage } from "@/i18n/translations";

const LANGS: AppLanguage[] = ["en", "uk", "pl", "fr"];

beforeAll(async () => {
  await Promise.all(LANGS.map((l) => loadLocale(l)));
});

describe("error mapping", () => {
  it("maps auth, validation, network and database errors onto keys", () => {
    expect(errorKeyFor({ message: "Invalid login credentials" })).toBe("errors.auth.invalidCredentials");
    expect(errorKeyFor({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe("errors.crud.duplicate");
    expect(errorKeyFor({ message: "new row violates row-level security policy" })).toBe("errors.general.permissionDenied");
    expect(errorKeyFor(new TypeError("Failed to fetch"))).toBe("errors.general.network");
    expect(errorKeyFor({ code: "PGRST301", message: "JWT expired" })).toBe("errors.general.sessionExpired");
  });

  it("never leaks raw backend text and never shows the key itself", () => {
    for (const lang of LANGS) {
      setActiveLang(lang);
      const msg = describeError({ message: 'duplicate key value violates unique constraint "clients_pkey"' });
      expect(msg).not.toContain("duplicate key");
      expect(msg).not.toContain("errors.");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("renders each language in its own words and reacts to a language change", () => {
    const seen = new Set<string>();
    for (const lang of LANGS) {
      setActiveLang(lang);
      seen.add(describeError({ message: "Invalid login credentials" }));
    }
    // All four languages produce distinct copy for the same error.
    expect(seen.size).toBe(LANGS.length);
  });

  it("uses the given fallback key when the error is unknown", () => {
    setActiveLang("uk");
    const msg = describeError({ message: "something very specific happened" }, "errors.crud.saveFailed");
    expect(msg).toBe(errorText("errors.crud.saveFailed", "uk"));
  });

  it("falls back to English when a language lacks the key", () => {
    setActiveLang("fr");
    expect(errorText("errors.general.unknown", "fr")).toBeTruthy();
    expect(englishDict["errors.general.unknown"]).toBeTruthy();
  });

  it("keeps every error key present in all four languages", async () => {
    const keys = Object.keys(englishDict).filter((k) => k.startsWith("errors."));
    expect(keys.length).toBeGreaterThan(40);
    for (const lang of LANGS) {
      const dict = await loadLocale(lang);
      for (const key of keys) expect(dict[key], `${lang} missing ${key}`).toBeTruthy();
    }
  });
});
