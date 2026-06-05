// Country-driven tax identifier configuration.
// The UI language only translates surrounding labels; the identifier code/label
// (NIP, SIRET, ЄДРПОУ, …) is determined by the selected business country.

export type BusinessCountry = "UA" | "PL" | "FR";

export interface TaxIdOption {
  code: string; // stored in profiles.tax_id_type
  label: string; // displayed in UI and on the invoice
  placeholder?: string;
  hint?: string; // validation hint, language-neutral
}

export const BUSINESS_COUNTRIES: BusinessCountry[] = ["UA", "PL", "FR"];

export const TAX_ID_OPTIONS: Record<BusinessCountry, TaxIdOption[]> = {
  UA: [
    { code: "ipn", label: "ІПН / РНОКПП", placeholder: "1234567890", hint: "10" },
    { code: "edrpou", label: "ЄДРПОУ", placeholder: "12345678", hint: "8" },
    { code: "ua_vat", label: "Номер платника ПДВ", placeholder: "" },
  ],
  PL: [
    { code: "nip", label: "NIP", placeholder: "1234567890", hint: "10" },
    { code: "regon", label: "REGON", placeholder: "123456789", hint: "9 / 14" },
    { code: "pesel", label: "PESEL", placeholder: "12345678901", hint: "11" },
    { code: "vat_ue", label: "VAT UE", placeholder: "PL1234567890" },
  ],
  FR: [
    { code: "siret", label: "SIRET", placeholder: "12345678900012", hint: "14" },
    { code: "siren", label: "SIREN", placeholder: "123456789", hint: "9" },
    { code: "fr_vat", label: "Numéro de TVA intracommunautaire", placeholder: "FR12345678901" },
  ],
};

export function getTaxIdLabel(code?: string | null): string {
  if (!code) return "";
  for (const opts of Object.values(TAX_ID_OPTIONS)) {
    const found = opts.find((o) => o.code === code);
    if (found) return found.label;
  }
  // Backward-compat fallbacks for legacy codes.
  if (code === "ipn") return "ІПН";
  if (code === "edrpou") return "ЄДРПОУ";
  return code.toUpperCase();
}

export function getDefaultTaxIdForCountry(country: BusinessCountry): string {
  return TAX_ID_OPTIONS[country][0].code;
}

export function isValidTaxIdForCountry(country: BusinessCountry, code: string): boolean {
  return TAX_ID_OPTIONS[country].some((o) => o.code === code);
}
