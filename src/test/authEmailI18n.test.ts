import { describe, it, expect } from "vitest";
// Pure TS module — no Deno-only deps — safe to import in vitest.
import {
  getStrings,
  getSubject,
  normalizeLang,
} from "../../../supabase/functions/_shared/email-templates/i18n";

describe("auth email i18n", () => {
  describe("normalizeLang", () => {
    it("falls back to en for unknown / missing values", () => {
      expect(normalizeLang(undefined)).toBe("en");
      expect(normalizeLang(null)).toBe("en");
      expect(normalizeLang("")).toBe("en");
      expect(normalizeLang("de")).toBe("en");
      expect(normalizeLang(42)).toBe("en");
    });
    it("recognizes uk, ua and pl variants", () => {
      expect(normalizeLang("uk")).toBe("uk");
      expect(normalizeLang("UK")).toBe("uk");
      expect(normalizeLang("uk-UA")).toBe("uk");
      expect(normalizeLang("ua")).toBe("uk");
      expect(normalizeLang("pl")).toBe("pl");
      expect(normalizeLang("PL")).toBe("pl");
      expect(normalizeLang("pl-PL")).toBe("pl");
    });
  });

  describe("Polish translations", () => {
    const pl = getStrings("pl");

    it("translates signup email", () => {
      expect(pl.signup.heading).toContain("Witamy");
      expect(pl.signup.cta).toBe("Potwierdź e-mail");
      expect(pl.signup.intro("Solo.Biz")).toContain("Dziękujemy");
      expect(pl.signup.confirmIntro("a@b.pl")).toContain("a@b.pl");
    });

    it("translates magic link, recovery, invite, email change, reauth", () => {
      expect(pl.magicLink.cta).toBe("Zaloguj się");
      expect(pl.recovery.heading).toBe("Zresetuj swoje hasło");
      expect(pl.invite.cta).toBe("Przyjmij zaproszenie");
      expect(pl.emailChange.cta).toBe("Potwierdź zmianę e-maila");
      expect(pl.emailChange.body("old@x.pl", "new@x.pl")).toContain(
        "z old@x.pl na new@x.pl",
      );
      expect(pl.reauthentication.heading).toBe("Potwierdź swoją tożsamość");
    });

    it("provides Polish subjects for every auth event", () => {
      expect(getSubject("signup", "pl")).toBe("Potwierdź swój e-mail");
      expect(getSubject("invite", "pl")).toBe("Zostałeś zaproszony");
      expect(getSubject("magiclink", "pl")).toBe("Twój link do logowania");
      expect(getSubject("recovery", "pl")).toBe("Zresetuj swoje hasło");
      expect(getSubject("email_change", "pl")).toBe(
        "Potwierdź nowy adres e-mail",
      );
      expect(getSubject("reauthentication", "pl")).toBe(
        "Twój kod weryfikacyjny",
      );
    });
  });

  describe("Ukrainian translations", () => {
    const uk = getStrings("uk");

    it("translates signup email", () => {
      expect(uk.signup.heading).toContain("Вітаємо");
      expect(uk.signup.cta).toBe("Підтвердити пошту");
      expect(uk.signup.intro("Solo.Biz")).toContain("Дякуємо");
    });

    it("translates magic link, recovery, invite, email change, reauth", () => {
      expect(uk.magicLink.cta).toBe("Увійти");
      expect(uk.recovery.heading).toBe("Скиньте свій пароль");
      expect(uk.invite.cta).toBe("Прийняти запрошення");
      expect(uk.emailChange.cta).toBe("Підтвердити зміну пошти");
      expect(uk.emailChange.body("a@x.ua", "b@x.ua")).toContain(
        "з a@x.ua на b@x.ua",
      );
      expect(uk.reauthentication.heading).toBe("Підтвердіть свою особу");
    });

    it("provides Ukrainian subjects for every auth event", () => {
      expect(getSubject("signup", "uk")).toBe("Підтвердіть свою пошту");
      expect(getSubject("invite", "uk")).toBe("Вас запросили");
      expect(getSubject("magiclink", "uk")).toBe("Ваше посилання для входу");
      expect(getSubject("recovery", "uk")).toBe("Скиньте свій пароль");
      expect(getSubject("email_change", "uk")).toBe(
        "Підтвердіть нову адресу пошти",
      );
      expect(getSubject("reauthentication", "uk")).toBe("Ваш код підтвердження");
    });
  });

  describe("English fallback", () => {
    it("returns English subjects when language is unknown", () => {
      expect(getSubject("signup", "de")).toBe("Confirm your email");
      expect(getSubject("recovery", undefined)).toBe("Reset your password");
    });
  });
});
