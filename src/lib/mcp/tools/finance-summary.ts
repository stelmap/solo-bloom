import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "finance_summary",
  title: "Finance summary",
  description: "Sum income and expenses for the signed-in user over a date range and return net profit.",
  inputSchema: {
    from: z.string().describe("ISO date lower bound (inclusive) for the `date` column."),
    to: z.string().describe("ISO date upper bound (inclusive) for the `date` column."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const [incomeRes, expenseRes] = await Promise.all([
      sb.from("income").select("amount, date, source, status").gte("date", from).lte("date", to),
      sb.from("expenses").select("amount, date, category, payment_status").gte("date", from).lte("date", to),
    ]);
    if (incomeRes.error) return { content: [{ type: "text", text: incomeRes.error.message }], isError: true };
    if (expenseRes.error) return { content: [{ type: "text", text: expenseRes.error.message }], isError: true };
    const income = (incomeRes.data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
    const expenses = (expenseRes.data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
    const summary = {
      from,
      to,
      income_total: income,
      expense_total: expenses,
      net: income - expenses,
      income_count: incomeRes.data?.length ?? 0,
      expense_count: expenseRes.data?.length ?? 0,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});
