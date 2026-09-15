import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  findDiscountIdByCode,
  getOrCreatePaddleCustomer,
  paddleCorsHeaders as corsHeaders,
  paddleFetch,
  SUPPORT_UA_DISCOUNT_CODE,
} from "../_shared/paddle.ts";

// Customers migrating from the previous payment provider keep their old price.
const LEGACY_DISCOUNTS: Record<string, { code: string; planCode: string; billingPeriod: string }> = {
  "hlushkowladyslav@gmail.com": { code: "LEGACYVLAD3", planCode: "solo", billingPeriod: "yearly" },
  "daria.benedite@gmail.com": { code: "LEGACYDARIA10", planCode: "solo", billingPeriod: "monthly" },
  "p6218030@gmail.com": { code: "LEGACYP621803010", planCode: "solo", billingPeriod: "monthly" },
  "os.symvoldrama@gmail.com": { code: "LEGACY1EURPRO", planCode: "pro", billingPeriod: "monthly" },
  "o.gilevich@gmail.com": { code: "LEGACY1EURSOLO", planCode: "solo", billingPeriod: "monthly" },
};

const VALID_PLAN_CODES = new Set(["solo", "pro"]);
const VALID_BILLING_PERIODS = new Set(["monthly", "quarterly", "yearly"]);

const log = (step: string, details?: unknown) => {
  const tail = details !== undefined ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${tail}`);
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "You must be signed in to start checkout." }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr) log("auth.getUser error", { message: userErr.message });
    const user = userData?.user;
    if (!user?.email) {
      return json({ error: "You must be signed in to start checkout." }, 401);
    }
    log("User authenticated", { userId: user.id });

    if (!Deno.env.get("PADDLE_API_KEY")) {
      return json({ error: "Server is not configured for payments. Please contact support." }, 500);
    }

    let body: { planCode?: string; billingPeriod?: string; locale?: string; promoCode?: string | null } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }

    const planCode = body.planCode;
    const billingPeriod = body.billingPeriod;
    if (!planCode || !VALID_PLAN_CODES.has(planCode) || !billingPeriod || !VALID_BILLING_PERIODS.has(billingPeriod)) {
      log("Unavailable plan selection", { planCode, billingPeriod });
      return json({ error: "This plan is currently unavailable. Please refresh and choose a plan again." }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const [priceResult, profileResult] = await Promise.all([
      supabaseAdmin
        .from("plan_prices")
        .select("paddle_price_id, plans!inner(code, is_active)")
        .eq("billing_period", billingPeriod)
        .eq("is_active", true)
        .eq("plans.code", planCode)
        .eq("plans.is_active", true)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("language, business_country")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const priceId = (priceResult.data as any)?.paddle_price_id as string | undefined;
    if (priceResult.error || !priceId) {
      log("Paddle price lookup failed", { planCode, billingPeriod, message: priceResult.error?.message });
      return json({ error: "This plan is currently unavailable. Please refresh and choose a plan again." }, 400);
    }

    // "Support Ukrainian Psychotherapists": eligibility is re-validated
    // server-side from the practice profile; the client hint is a fallback.
    const profile = (profileResult.data as any) as { language?: string; business_country?: string } | null;
    const country = String(profile?.business_country ?? "").trim().toLowerCase();
    const profileLang = String(profile?.language ?? "").trim().toLowerCase();
    const promoCodeSent = String(body.promoCode ?? "").trim().toUpperCase();
    const campaignEligible =
      ["ua", "ukr", "ukraine", "україна", "украина"].includes(country) ||
      profileLang === "uk" ||
      promoCodeSent === SUPPORT_UA_DISCOUNT_CODE ||
      promoCodeSent === "SUPPORT_UA_PSYCHOTHERAPY_50";
    log("Support Ukraine eligibility", { campaignEligible });

    // Legacy customers migrating from the previous provider keep their old
    // price through a personal, recurring discount code.
    const legacy = LEGACY_DISCOUNTS[user.email.toLowerCase()];
    const legacyMatch = legacy && legacy.planCode === planCode && legacy.billingPeriod === billingPeriod
      ? legacy
      : null;

    let discountId: string | null = null;
    if (legacyMatch) {
      try {
        discountId = await findDiscountIdByCode(legacyMatch.code);
        log("Legacy discount applied", { code: legacyMatch.code });
      } catch (err) {
        log("Legacy discount lookup failed", { message: err instanceof Error ? err.message : String(err) });
      }
    }
    if (!discountId && campaignEligible) {
      try {
        discountId = await findDiscountIdByCode(SUPPORT_UA_DISCOUNT_CODE);
      } catch (err) {
        log("Discount lookup failed", { message: err instanceof Error ? err.message : String(err) });
      }
    }

    const customerId = await getOrCreatePaddleCustomer(user.email, user.id);

    const origin = req.headers.get("origin") || "https://solo-bizz.com";
    const customData = {
      user_id: user.id,
      plan_code: planCode,
      billing_period: billingPeriod,
      ...(campaignEligible ? { campaign: SUPPORT_UA_DISCOUNT_CODE } : {}),
    };

    const txn = await paddleFetch<{ data: { id: string; checkout?: { url?: string | null } } }>("/transactions", {
      method: "POST",
      body: {
        items: [{ price_id: priceId, quantity: 1 }],
        customer_id: customerId,
        ...(discountId ? { discount_id: discountId } : {}),
        custom_data: customData,
        // No explicit checkout.url: Paddle only accepts approved domains, and
        // preview/dev origins are not approved. The account default payment
        // link is used instead, and we open the overlay on our own page.
      },
    });

    const transactionId = txn.data.id;
    const checkoutUrl = `${origin}/checkout?_ptxn=${transactionId}`;

    log("Transaction created", { transactionId });
    return json({ url: checkoutUrl, transactionId, sessionId: transactionId }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Unhandled error", { message });
    if (message.includes("transaction_default_checkout_url_not_set")) {
      return json(
        { error: "Payments are not fully set up yet: the default payment link is missing in the payment provider settings." },
        500,
      );
    }
    if (message.includes("transaction_checkout_not_enabled")) {
      return json(
        {
          error: "Payments are temporarily unavailable: the payment provider has not finished account verification.",
          code: "checkout_not_enabled",
        },
        503,
      );
    }
    return json({ error: "Could not start checkout. Please try again." }, 500);
  }
});
