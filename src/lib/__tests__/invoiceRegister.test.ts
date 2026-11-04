import { describe, expect, it } from "vitest";
import { filterInvoiceRegister } from "../invoiceRegister";

const invoices = [
  { invoice_number: "2026/11/04/0001", client_name: "Olga", invoice_date: "2026-11-04", appointment_id: null },
  { invoice_number: "2026/11/03/0001", client_name: "Daria", invoice_date: "2026-11-03", appointment_id: "meeting" },
];
describe("invoice register", () => {
  it("includes payments without meetings and linked meetings in the same register", () => {
    expect(filterInvoiceRegister(invoices, "", "", "")).toEqual(invoices);
  });
  it("finds an invoice by client irrespective of case", () => {
    expect(filterInvoiceRegister(invoices, " DARIA ", "", "")).toEqual([invoices[1]]);
  });
  it("filters dates inclusively without rewriting stored invoice numbers", () => {
    expect(filterInvoiceRegister(invoices, "", "2026-11-04", "2026-11-04")).toEqual([invoices[0]]);
  });
});