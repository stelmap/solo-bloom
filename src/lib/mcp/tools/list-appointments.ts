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
  name: "list_appointments",
  title: "List appointments",
  description: "List the signed-in user's appointments in a date range, optionally filtered by client or status.",
  inputSchema: {
    from: z.string().describe("ISO date/datetime lower bound (inclusive) for scheduled_at."),
    to: z.string().describe("ISO date/datetime upper bound (exclusive) for scheduled_at."),
    client_id: z.string().uuid().optional().describe("Only return appointments for this client id."),
    status: z.enum(["scheduled", "completed", "cancelled"]).optional().describe("Filter by appointment status."),
    limit: z.number().int().min(1).max(500).optional().describe("Max results (default 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, client_id, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("appointments")
      .select("id, client_id, service_id, scheduled_at, duration_minutes, status, payment_status, price, notes")
      .gte("scheduled_at", from)
      .lt("scheduled_at", to)
      .order("scheduled_at", { ascending: true })
      .limit(limit ?? 100);
    if (client_id) q = q.eq("client_id", client_id);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { appointments: data ?? [] },
    };
  },
});
