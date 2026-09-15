import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PADDLE_ENVIRONMENT, paddleCorsHeaders as corsHeaders } from "../_shared/paddle.ts";

// Returns the publishable Paddle.js configuration used by the checkout page.
// The client-side token is publishable by design; no authentication needed.
serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientToken = Deno.env.get("PADDLE_CLIENT_TOKEN") ?? "";
  return new Response(
    JSON.stringify({ clientToken, environment: PADDLE_ENVIRONMENT }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: clientToken ? 200 : 500 },
  );
});
