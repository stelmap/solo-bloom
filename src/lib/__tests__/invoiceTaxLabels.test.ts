import { describe, it, expect } from "vitest";
import {
  TAX_ID_OPTIONS,
  getTaxIdLabel,
  getDefaultTaxIdForCountry,
  isValidTaxIdForCountry,
  type BusinessCountry,
} from "@/lib/taxIdentifiers";

/**
 * Regression tests for the invoice tax-identifier mapping.
 *
 * Rule: the tax identifier label (SIRET, NIP, ЄДРПОУ, …) is determined
 * by the SELECTED BUSINESS COUNTRY + tax_id_type code stored on the
 * profile/invoice — NOT by the UI language. The UI language only
 * translates surrounding labels.
 */

type Case = {
  name: string;
  country: BusinessCountry;
  uiLang: "en" | "uk" | "fr" | "pl";
  taxIdType: string;
  taxIdValue: string;
  expectedInvoiceLine: string; // "<LABEL>: <VALUE>" rendered in the invoice From-block
};

const cases: Case[] = [
  {
    name: "France + French UI + SIRET",
    country: "FR",
    uiLang: "fr",
    taxIdType: "siret",
    taxIdValue: "12345678900012",
    expectedInvoiceLine: "SIRET: 12345678900012",
  },
  {
    name: "France + Ukrainian UI + SIRET",
    country: "FR",
    uiLang: "uk",
    taxIdType: "siret",
    taxIdValue: "12345678900012",
    expectedInvoiceLine: "SIRET: 12345678900012",
  },
  {
    name: "Poland + Polish UI + NIP",
    country: "PL",
    uiLang: "pl",
    taxIdType: "nip",
    taxIdValue: "1234567890",
    expectedInvoiceLine: "NIP: 1234567890",
  },
  {
    name: "Poland + French UI + NIP",
    country: "PL",
    uiLang: "fr",
    taxIdType: "nip",
    taxIdValue: "1234567890",
    expectedInvoiceLine: "NIP: 1234567890",
  },
  {
    name: "Ukraine + Ukrainian UI + ЄДРПОУ",
    country: "UA",
    uiLang: "uk",
    taxIdType: "edrpou",
    taxIdValue: "12345678",
    expectedInvoiceLine: "ЄДРПОУ: 12345678",
  },
];

describe("invoice tax-identifier label mapping (country-driven, language-independent)", () => {
  for (const c of cases) {
    it(c.name, () => {
      // 1. The chosen tax_id_type is actually valid for the chosen country.
      expect(isValidTaxIdForCountry(c.country, c.taxIdType)).toBe(true);

      // 2. The label rendered on the invoice From-block matches expectation,
      //    regardless of UI language.
      const label = getTaxIdLabel(c.taxIdType);
      const line = `${label}: ${c.taxIdValue}`;
      expect(line).toBe(c.expectedInvoiceLine);
    });
  }

  it("French UI never accidentally renders Ukrainian labels for a French SIRET", () => {
    const label = getTaxIdLabel("siret");
    expect(label).toBe("SIRET");
    expect(label).not.toMatch(/ІПН|ЄДРПОУ|NIP|TVA/);
  });

  it("Polish UI never accidentally renders Ukrainian labels for a Polish NIP", () => {
    const label = getTaxIdLabel("nip");
    expect(label).toBe("NIP");
    expect(label).not.toMatch(/ІПН|ЄДРПОУ|SIRET/);
  });
});

describe("country → tax_id options exposure", () => {
  it("Ukraine exposes ipn, edrpou, ua_vat (and nothing from PL/FR)", () => {
    const codes = TAX_ID_OPTIONS.UA.map((o) => o.code);
    expect(codes).toEqual(["ipn", "edrpou", "ua_vat"]);
    expect(codes).not.toContain("nip");
    expect(codes).not.toContain("siret");
  });

  it("Poland exposes nip, regon, pesel, vat_ue (and nothing from UA/FR)", () => {
    const codes = TAX_ID_OPTIONS.PL.map((o) => o.code);
    expect(codes).toEqual(["nip", "regon", "pesel", "vat_ue"]);
    expect(codes).not.toContain("ipn");
    expect(codes).not.toContain("edrpou");
    expect(codes).not.toContain("siret");
  });

  it("France exposes siret, siren, fr_vat (and nothing from UA/PL)", () => {
    const codes = TAX_ID_OPTIONS.FR.map((o) => o.code);
    expect(codes).toEqual(["siret", "siren", "fr_vat"]);
    expect(codes).not.toContain("ipn");
    expect(codes).not.toContain("edrpou");
    expect(codes).not.toContain("nip");
  });

  it("default tax_id_type matches the first option of each country", () => {
    expect(getDefaultTaxIdForCountry("UA")).toBe("ipn");
    expect(getDefaultTaxIdForCountry("PL")).toBe("nip");
    expect(getDefaultTaxIdForCountry("FR")).toBe("siret");
  });

  it("isValidTaxIdForCountry rejects cross-country codes", () => {
    expect(isValidTaxIdForCountry("FR", "ipn")).toBe(false);
    expect(isValidTaxIdForCountry("FR", "nip")).toBe(false);
    expect(isValidTaxIdForCountry("PL", "siret")).toBe(false);
    expect(isValidTaxIdForCountry("PL", "edrpou")).toBe(false);
    expect(isValidTaxIdForCountry("UA", "siret")).toBe(false);
    expect(isValidTaxIdForCountry("UA", "nip")).toBe(false);
  });
});

describe("invoice does NOT include the internal calendar payment-status line", () => {
  it("invoicePdf source intentionally omits paymentType rendering", async () => {
    // Read the source as text to assert that the internal "Payment type"
    // line is not rendered. The string "paymentType" remains only as a
    // label dictionary key (for legacy compatibility) but must NOT be
    // referenced via t("paymentType", …) anywhere in the renderer.
    const src = await import("@/lib/invoicePdf?raw" as any).then(
      (m: any) => m.default as string,
    );
    expect(src).not.toMatch(/t\(\s*["']paymentType["']/);
    // Sanity: payment_method and payment_date are still rendered.
    expect(src).toMatch(/t\(\s*["']paymentMethod["']/);
    expect(src).toMatch(/t\(\s*["']paymentDate["']/);
  });
});
