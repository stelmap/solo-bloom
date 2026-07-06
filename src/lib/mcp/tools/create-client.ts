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
  name: "create_client",
  title: "Create client",
  description: "Create a new client record for the signed-in user.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Client display name."),
    email: z.string().email().optional().describe("Client email (optional)."),
    phone: z.string().optional().describe("Client phone (optional)."),
    notes: z.string().optional().describe("Free-form notes (optional)."),
    base_price: z.number().nonnegative().optional().describe("Default per-session price (optional)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ name, email, phone, notes, base_price }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("clients")
      .insert({
        user_id: ctx.getUserId(),
        name,
        email: email ?? null,
        phone: phone ?? null,
        notes: notes ?? null,
        base_price: base_price ?? null,
      })
      .select("id, name, email, phone, notes, base_price, status, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { client: data },
    };
  },
});
