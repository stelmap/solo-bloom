export type FieldType = "short" | "long" | "dropdown" | "checkbox";
export type FormField = { id: string; label: string; type: FieldType; required: boolean; hint?: string; options?: string[]; system?: boolean };
export type RegistrationForm = { fields: FormField[] };

export const SYSTEM_IDS = ["name", "email"] as const;

/** Name and Email always exist, first, required, and keep their type. */
export function normalizeForm(raw: any, defaults: { name: string; email: string }): RegistrationForm {
  const list: FormField[] = Array.isArray(raw?.fields) ? raw.fields : [];
  const byId = new Map(list.map((f) => [f.id, f]));
  const name: FormField = { id: "name", type: "short", required: true, system: true, label: byId.get("name")?.label?.trim() || defaults.name };
  const email: FormField = { id: "email", type: "short", required: true, system: true, label: byId.get("email")?.label?.trim() || defaults.email };
  const rest = list.filter((f) => !SYSTEM_IDS.includes(f.id as any)).map((f) => ({ ...f, system: false }));
  return { fields: [name, email, ...rest] };
}

export type FieldError = { id: string; code: "label" | "options" | "duplicateOption" };
export function validateForm(form: RegistrationForm): FieldError[] {
  const errs: FieldError[] = [];
  for (const f of form.fields) {
    if (!f.label.trim() || f.label.length > 200) errs.push({ id: f.id, code: "label" });
    if (f.type === "dropdown") {
      const opts = (f.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) errs.push({ id: f.id, code: "options" });
      else if (new Set(opts).size !== opts.length) errs.push({ id: f.id, code: "duplicateOption" });
    }
  }
  return errs;
}

export function cleanForm(form: RegistrationForm): RegistrationForm {
  return { fields: form.fields.map((f) => ({
    id: f.id, label: f.label.trim(), type: f.system ? "short" : f.type, required: f.system ? true : !!f.required,
    ...(f.hint?.trim() ? { hint: f.hint.trim() } : {}),
    ...(f.type === "dropdown" && !f.system ? { options: (f.options ?? []).map((o) => o.trim()).filter(Boolean) } : {}),
  })) };
}

export function moveField(form: RegistrationForm, id: string, dir: -1 | 1): RegistrationForm {
  const fields = [...form.fields];
  const i = fields.findIndex((f) => f.id === id);
  const j = i + dir;
  if (i < 2 || j < 2 || j >= fields.length) return form; // system fields stay on top
  [fields[i], fields[j]] = [fields[j], fields[i]];
  return { fields };
}

export function removeField(form: RegistrationForm, id: string): RegistrationForm {
  if (SYSTEM_IDS.includes(id as any)) return form;
  return { fields: form.fields.filter((f) => f.id !== id) };
}

// ---- Group finances (read-only; built from records created when meetings are closed) ----
export type GroupPaymentRow = {
  client_id: string; client_name: string; amount: number; payment_state: string; billing_rule_applied: boolean | null;
  expected_status: string | null; appointment_status: string | null; scheduled_at: string | null;
};
export type GroupFinance = {
  charged: number; received: number; outstanding: number;
  debtors: { client_id: string; name: string; amount: number; dates: string[] }[];
};

export function groupFinance(rows: GroupPaymentRow[]): GroupFinance {
  let charged = 0, received = 0, outstanding = 0;
  const debt = new Map<string, { client_id: string; name: string; amount: number; dates: string[] }>();
  for (const r of rows) {
    const amt = Number(r.amount) || 0;
    if (amt <= 0 || r.billing_rule_applied === false) continue;
    if (r.appointment_status === "cancelled" || r.expected_status === "cancelled") continue;
    charged += amt;
    const paid = r.payment_state.startsWith("paid") || r.expected_status === "paid";
    if (paid) { received += amt; continue; }
    if (r.payment_state === "waiting_for_payment") {
      outstanding += amt;
      const d = debt.get(r.client_id) ?? { client_id: r.client_id, name: r.client_name, amount: 0, dates: [] };
      d.amount += amt;
      if (r.scheduled_at) d.dates.push(r.scheduled_at);
      debt.set(r.client_id, d);
    }
  }
  const debtors = [...debt.values()].map((d) => ({ ...d, dates: d.dates.sort() })).sort((a, b) => b.amount - a.amount);
  return { charged, received, outstanding, debtors };
}

/** Unique confirmed people, not applications. */
export function uniqueConfirmedParticipants(regs: { status: string; client_id: string | null; email: string }[]): number {
  return new Set(regs.filter((r) => r.status === "confirmed").map((r) => r.client_id ?? r.email.toLowerCase())).size;
}
