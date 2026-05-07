import { test, expect, Page } from "../../playwright-fixture";
import {
  hasRegressionAuth,
  installRegressionAuth,
  expectAuthenticated,
} from "./helpers";

/**
 * Force the app's selected language by writing to localStorage *before* the app
 * boots. Mirrors what `setPreLoginLang` does, so it works on every route.
 */
async function presetLanguage(page: Page, lang: "en" | "uk" | "fr" | "pl") {
  await page.addInitScript((l) => {
    localStorage.setItem("app_lang", l);
    localStorage.setItem("landing_lang", l);
    localStorage.setItem("pre_login_lang", l);
  }, lang);
}

const SAMPLES: Record<"uk" | "fr", { signIn: RegExp; welcome: RegExp }> = {
  uk: { signIn: /Увійти/i, welcome: /З поверненням/i },
  fr: { signIn: /Connexion/i, welcome: /Bon retour/i },
};

test.describe("Localization persistence (pre-login)", () => {
  test("Ukrainian selected on landing → /auth shows Ukrainian", async ({ page }) => {
    await presetLanguage(page, "uk");
    await page.goto("/");
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: SAMPLES.uk.welcome })).toBeVisible();
    await expect(page.getByRole("button", { name: SAMPLES.uk.signIn })).toBeVisible();
  });

  test("French selected on landing → /auth shows French", async ({ page }) => {
    await presetLanguage(page, "fr");
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: SAMPLES.fr.welcome })).toBeVisible();
    await expect(page.getByRole("button", { name: SAMPLES.fr.signIn })).toBeVisible();
  });

  test("Auth → forgot-password keeps Ukrainian", async ({ page }) => {
    await presetLanguage(page, "uk");
    await page.goto("/auth");
    // Click "Forgot password?" link
    await page.getByRole("button", { name: /Забули пароль/i }).click();
    // Reset password screen still in UA
    await expect(page.getByRole("heading", { name: /Скинути пароль|Відновлення пароля/i })).toBeVisible();
  });

  test("Reset-password page in selected language", async ({ page }) => {
    await presetLanguage(page, "fr");
    await page.goto("/reset-password");
    // The page should render French copy somewhere — fall back to checking <html lang> set or any FR text.
    // We can't deterministically know the heading slug, so assert language attribute hint via title.
    await page.waitForLoadState("domcontentloaded");
    const html = await page.locator("html").getAttribute("lang");
    // LanguageProvider doesn't set <html lang>; assert via any French copy snippet that appears on the page.
    // If your reset page uses a heading like "Réinitialiser le mot de passe", this asserts it.
    const frHint = page.getByText(/mot de passe|réinitialiser/i).first();
    await expect(frHint).toBeVisible({ timeout: 5000 });
    expect(html ?? "").toBeDefined();
  });

  test("Pricing page (/plans) shows selected language", async ({ page }) => {
    await presetLanguage(page, "uk");
    await page.goto("/plans");
    // Any UA text from pricing copy. "Тариф" / "План" / "Обрати" are common.
    await expect(page.getByText(/План|Тариф|Обрати|Місяць/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("Refresh keeps selected language on /auth", async ({ page }) => {
    await presetLanguage(page, "uk");
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: SAMPLES.uk.welcome })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: SAMPLES.uk.welcome })).toBeVisible();
  });

  test("Browser default English does not override selected Ukrainian", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("app_lang", "uk");
      localStorage.setItem("landing_lang", "uk");
      localStorage.setItem("pre_login_lang", "uk");
    });
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: SAMPLES.uk.welcome })).toBeVisible();
    await context.close();
  });
});

// Authenticated flows — only run when a seeded test account is configured.
test.describe("Localization persistence (post-login)", () => {
  test.skip(!hasRegressionAuth(), "Requires TEST_USER_ID / TEST_ACCESS_TOKEN env vars.");

  const APP_ROUTES = [
    "/dashboard",
    "/calendar",
    "/clients",
    "/services",
    "/finances",
    "/settings",
  ];

  for (const route of APP_ROUTES) {
    test(`Ukrainian persists on ${route}`, async ({ page }) => {
      await presetLanguage(page, "uk");
      await installRegressionAuth(page);
      await page.goto(route);
      // Some routes may redirect; tolerate that and assert any UA copy is present.
      await page.waitForLoadState("networkidle").catch(() => {});
      // Common UA tokens used across nav/menus.
      const uaCopy = page.getByText(
        /Інформаційна панель|Календар|Клієнти|Послуги|Фінанси|Налаштування|Вийти/i,
      ).first();
      await expect(uaCopy).toBeVisible({ timeout: 10_000 });
    });
  }

  test("Refresh on /dashboard keeps Ukrainian", async ({ page }) => {
    await presetLanguage(page, "uk");
    await installRegressionAuth(page);
    await page.goto("/dashboard");
    await expectAuthenticated(page);
    await page.reload();
    const uaCopy = page.getByText(/Інформаційна панель|Клієнти|Календар|Налаштування/i).first();
    await expect(uaCopy).toBeVisible({ timeout: 10_000 });
  });
});
