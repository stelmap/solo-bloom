import { describe, it, expect } from "vitest";

// Simulates the expense category logic from ExpensesPage
const DEFAULT_CATEGORIES = ["Rent", "Materials", "Insurance", "Equipment", "Marketing", "Utilities", "Laundry", "Software", "Tax", "Other"];

function mergeCategories(expenses: { category: string }[]): string[] {
  const customCats = expenses
    .map(e => e.category)
    .filter(c => c && !DEFAULT_CATEGORIES.includes(c));
  return [...DEFAULT_CATEGORIES, ...Array.from(new Set(customCats))];
}

function catLabel(cat: string, translations: Record<string, string>): string {
  const key = `category.${cat}`;
  const translated = translations[key];
  // If no translation, fall back to raw category name
  return translated || cat;
}

describe("Expense category mapping", () => {
  it("includes default categories", () => {
    const categories = mergeCategories([]);
    expect(categories).toContain("Rent");
    expect(categories).toContain("Other");
    expect(categories).toContain("Tax");
  });

  it("includes custom categories from wizard data", () => {
    const expenses = [
      { category: "Rent" },
      { category: "Studio Supplies" },
      { category: "Professional Development" },
    ];
    const categories = mergeCategories(expenses);
    expect(categories).toContain("Studio Supplies");
    expect(categories).toContain("Professional Development");
    // Default ones still present
    expect(categories).toContain("Rent");
  });

  it("deduplicates custom categories", () => {
    const expenses = [
      { category: "Studio Supplies" },
      { category: "Studio Supplies" },
      { category: "Studio Supplies" },
    ];
    const categories = mergeCategories(expenses);
    const count = categories.filter(c => c === "Studio Supplies").length;
    expect(count).toBe(1);
  });

  it("does not duplicate default categories from data", () => {
    const expenses = [{ category: "Rent" }, { category: "Rent" }];
    const categories = mergeCategories(expenses);
    const count = categories.filter(c => c === "Rent").length;
    expect(count).toBe(1);
  });

  it("shows raw name for custom categories without translation", () => {
    const translations = { "category.Rent": "Оренда" };
    expect(catLabel("Rent", translations)).toBe("Оренда");
    expect(catLabel("Studio Supplies", translations)).toBe("Studio Supplies");
  });

  it("filters out empty categories", () => {
    const expenses = [{ category: "" }, { category: "Rent" }];
    const categories = mergeCategories(expenses);
    expect(categories).not.toContain("");
  });
});
