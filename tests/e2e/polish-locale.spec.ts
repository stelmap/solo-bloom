import { test, expect } from "../../playwright-fixture";

/**
 * E2E checks for Polish (PL) language rendering on the landing page.
 *
 * The language toggle cycles EN → FR → UK → PL → EN. We seed `landing_lang`
 * in localStorage so the page boots directly in Polish — this is robust against
 * the cycle order changing.
 */

const seedLang = async (page: any, lang: "en" | "fr" | "uk" | "pl") => {
  await page.addInitScript((l: string) => {
    try {
      localStorage.setItem("landing_lang", l);
      localStorage.setItem("app_lang", l);
    } catch {}
  }, lang);
};

test.describe("Polish locale rendering", () => {
  test("landing page renders Polish strings when lang=pl", async ({ page }) => {
    await seedLang(page, "pl");
    await page.goto("/");

    // Toggle should display the Polish flag/code
    const toggle = page.getByRole("button", { name: /switch language/i });
    await expect(toggle).toContainText("PL");

    // Polish nav items
    await expect(page.getByRole("link", { name: "Funkcje" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Cennik" }).first()).toBeVisible();

    // Polish hero copy
    await expect(page.getByText("Prowadź swój jednoosobowy biznes.")).toBeVisible();
  });

  test("toggle cycles into Polish from English", async ({ page }) => {
    await seedLang(page, "en");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /switch language/i });
    await expect(toggle).toContainText("EN");

    // Cycle until we land on PL (max 4 clicks)
    for (let i = 0; i < 4; i++) {
      const text = (await toggle.textContent())?.trim() ?? "";
      if (text.includes("PL")) break;
      await toggle.click();
    }
    await expect(toggle).toContainText("PL");
    await expect(page.getByRole("link", { name: "Cennik" }).first()).toBeVisible();
  });

  test("Intl formatters produce Polish date / number / currency output", async ({ page }) => {
    await seedLang(page, "pl");
    await page.goto("/");

    // Run the format checks inside the page context where the browser's Intl
    // implementation is the same one the app uses.
    const result = await page.evaluate(() => {
      const date = new Date(Date.UTC(2026, 0, 31, 12, 0, 0)); // 31 Jan 2026
      return {
        number: new Intl.NumberFormat("pl-PL").format(1234567.89),
        currencyPLN: new Intl.NumberFormat("pl-PL", {
          style: "currency",
          currency: "PLN",
        }).format(1234.5),
        currencyEUR: new Intl.NumberFormat("pl-PL", {
          style: "currency",
          currency: "EUR",
        }).format(1234.5),
        dateLong: new Intl.DateTimeFormat("pl-PL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(date),
        monthName: new Intl.DateTimeFormat("pl-PL", { month: "long" }).format(date),
      };
    });

    // Polish uses non-breaking spaces (\u00A0) as group separators and a comma decimal.
    expect(result.number.replace(/\u00A0/g, " ")).toBe("1 234 567,89");

    // PLN currency: "1234,50 zł" (with non-breaking space before zł).
    expect(result.currencyPLN.replace(/\u00A0/g, " ")).toMatch(/1[\s ]234,50\s?zł/);

    // EUR in pl-PL format: "1234,50 €".
    expect(result.currencyEUR.replace(/\u00A0/g, " ")).toMatch(/1[\s ]234,50\s?€/);

    // Polish month name for January is "styczeń"; in date context it's "stycznia".
    expect(result.dateLong).toBe("31 stycznia 2026");
    expect(result.monthName).toBe("styczeń");
  });
});
