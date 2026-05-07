// Shared Telegram helpers using the Lovable connector gateway.
export const TELEGRAM_GATEWAY = 'https://connector-gateway.lovable.dev/telegram';

export function getTelegramEnv() {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const tgKey = Deno.env.get('TELEGRAM_API_KEY');
  if (!lovableKey) throw new Error('LOVABLE_API_KEY is not configured');
  if (!tgKey) throw new Error('TELEGRAM_API_KEY is not configured');
  return { lovableKey, tgKey };
}

export async function tgFetch(path: string, body: unknown) {
  const { lovableKey, tgKey } = getTelegramEnv();
  const res = await fetch(`${TELEGRAM_GATEWAY}/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': tgKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(`Telegram ${path} failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function deriveTelegramWebhookSecret(): Promise<string> {
  const { tgKey } = getTelegramEnv();
  const data = new TextEncoder().encode(`telegram-webhook:${tgKey}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export const TELEGRAM_BOT_USERNAME = 'Solobizz_remider_bot';
