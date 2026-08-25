export async function createUnsubscribeToken(
  secret: string,
  senderDomain: string,
  recipient: string,
  idempotencyKey: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${senderDomain}:${recipient.toLowerCase()}:${idempotencyKey}`)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, data)
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}