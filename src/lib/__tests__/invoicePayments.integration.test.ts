import { createClient } from "@supabase/supabase-js";
import { describe, it, expect } from "vitest";

const url = process.env.INVOICE_TEST_URL;
const key = process.env.INVOICE_TEST_KEY;
const token = process.env.INVOICE_TEST_TOKEN;
const owner = process.env.INVOICE_TEST_OWNER;
describe.skipIf(!url || !key || !token || !owner)("automatic invoices (authenticated database)", () => {
  it("invoices confirmed payments with/without meetings, but not drafts, cancelled, failed or prepaid withdrawals; preserves numbering and idempotency", async () => {
    if (!url || !key || !token || !owner) throw new Error("Missing test session");
    const db = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const ids: string[] = [];
    let clientId: string | undefined;
    let serviceId: string | undefined;
    let appointmentId: string | undefined;
    try {
      const client = await db.from("clients").insert({ user_id: owner, name: "QA Invoice Register Temporary" }).select("id").single();
      if (client.error) throw client.error;
      clientId = client.data.id;
      const service = await db.from("services").insert({ user_id: owner, name: "QA Invoice Register Temporary", price: 20, duration_minutes: 60 }).select("id").single();
      if (service.error) throw service.error;
      serviceId = service.data.id;
      const appointment = await db.from("appointments").insert({ user_id: owner, client_id: clientId, service_id: serviceId, scheduled_at: "2026-11-04T08:00:00Z", duration_minutes: 60, price: 20, status: "completed", payment_status: "paid_now" }).select("id").single();
      if (appointment.error) throw appointment.error;
      appointmentId = appointment.data.id;
      const add = async (patch: Record<string, unknown>) => {
        const result = await db.from("income").insert({ user_id: owner, client_id: clientId, amount: 20, date: "2026-11-04", payment_method: "cash", source: "manual", ...patch }).select("id").single();
        if (result.error) throw result.error;
        ids.push(result.data.id); return result.data.id;
      };
      const invoices = async (id: string) => {
        const result = await db.from("invoices").select("*").eq("income_id", id);
        if (result.error) throw result.error;
        return result.data;
      };
      const expected = await db.rpc("generate_invoice_number", { p_user_id: owner, p_session_date: "2026-11-04" });
      if (expected.error) throw expected.error;
      const unlinked = await add({ status: "confirmed" });
      const unlinkedInvoices = await invoices(unlinked);
      expect(unlinkedInvoices).toHaveLength(1);
      expect(unlinkedInvoices[0].appointment_id).toBeNull();
      expect(unlinkedInvoices[0].invoice_number).toBe(expected.data);
      expect(Number(unlinkedInvoices[0].total_amount)).toBe(20);
      expect(unlinkedInvoices[0].payment_method).toBe("cash");
      expect(unlinkedInvoices[0].payment_date).toBe("2026-11-04");
      const linked = await add({ status: "confirmed", appointment_id: appointmentId, payment_method: "card" });
      expect((await invoices(linked))[0].appointment_id).toBe(appointmentId);
      expect((await invoices(linked))[0].payment_method).toBe("card");
      const repeat = await db.from("income").update({ status: "confirmed" }).eq("id", linked);
      if (repeat.error) throw repeat.error;
      expect(await invoices(linked)).toHaveLength(1);
      const draft = await add({ status: "draft" });
      expect(await invoices(draft)).toHaveLength(0);
      const cancelled = await add({ status: "cancelled" });
      expect(await invoices(cancelled)).toHaveLength(0);
      const withdrawal = await add({ status: "confirmed", source: "prepayment_withdrawal" });
      expect(await invoices(withdrawal)).toHaveLength(0);
      const confirm = await db.from("income").update({ status: "confirmed" }).eq("id", draft);
      if (confirm.error) throw confirm.error;
      expect(await invoices(draft)).toHaveLength(1);
      const badId = crypto.randomUUID();
      const failed = await db.from("income").insert({ id: badId, user_id: owner, client_id: crypto.randomUUID(), amount: 20, status: "confirmed" });
      expect(failed.error).not.toBeNull();
      expect(await invoices(badId)).toHaveLength(0);
    } finally {
      for (const id of ids) {
        const invoiceCleanup = await db.from("invoices").delete().eq("income_id", id);
        if (invoiceCleanup.error) throw invoiceCleanup.error;
        const incomeCleanup = await db.from("income").delete().eq("id", id);
        if (incomeCleanup.error) throw incomeCleanup.error;
      }
      if (appointmentId) await db.from("appointments").delete().eq("id", appointmentId);
      if (serviceId) await db.from("services").delete().eq("id", serviceId);
      if (clientId) await db.from("clients").delete().eq("id", clientId);
    }
  }, 45000);
});