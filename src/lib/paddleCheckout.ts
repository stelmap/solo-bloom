import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { supabase } from "@/integrations/supabase/client";

/** Paddle only launches its overlay from approved domains. */
export const CANONICAL_HOST = "solo-bizz.com";
export const isApprovedHost = (host: string) =>
  host === CANONICAL_HOST || host === "localhost" || host.startsWith("localhost:");

export type PaddleHandlers = {
  onCompleted?: () => void;
  onClosed?: () => void;
  onError?: () => void;
};

let paddlePromise: Promise<Paddle | undefined> | null = null;
let handlers: PaddleHandlers = {};
let completed = false;

function getPaddle() {
  if (!paddlePromise) {
    paddlePromise = (async () => {
      const { data, error } = await supabase.functions.invoke("paddle-config");
      if (error || !data?.clientToken) throw error ?? new Error("missing_client_token");
      return initializePaddle({
        token: data.clientToken,
        environment: data.environment === "production" ? "production" : "sandbox",
        eventCallback: (event) => {
          if (event?.name === "checkout.completed") {
            completed = true;
            handlers.onCompleted?.();
          } else if (event?.name === "checkout.error") {
            handlers.onError?.();
          } else if (event?.name === "checkout.closed" && !completed) {
            handlers.onClosed?.();
          }
        },
      });
    })().catch((e) => {
      paddlePromise = null;
      throw e;
    });
  }
  return paddlePromise;
}

/** Opens the Paddle overlay for an existing transaction. Throws if it cannot. */
export async function openPaddleCheckout(transactionId: string, lang: string, h: PaddleHandlers) {
  const paddle = await getPaddle();
  if (!paddle) throw new Error("paddle_unavailable");
  handlers = h;
  completed = false;
  // Paddle has no Ukrainian locale; fall back to English for it.
  const locale = ["en", "pl", "fr", "ru"].includes(lang) ? lang : "en";
  paddle.Checkout.open({
    transactionId,
    settings: { locale, displayMode: "overlay", variant: "one-page" },
  });
}
