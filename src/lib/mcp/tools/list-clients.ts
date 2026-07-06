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
  name: "list_clients",
  title: "List clients",
  description: "List the signed-in user's clients. Supports search by name/email and pagination.",
  inputSchema: {
    search: z.string().optional().describe("Case-insensitive substring match on name or email."),
    status: z.enum(["active", "archived"]).optional().describe("Filter by status. Defaults to active."),
    limit: z.number().int().min(1).max(200).optional().describe("Max results (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("clients")
      .select("id, name, email, phone, status, notes, base_price, created_at")
      .eq("status", status ?? "active")
      .order("name", { ascending: true })
      .limit(limit ?? 50);
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`name.ilike.${s},email.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { clients: data ?? [] },
    };
  },
});
