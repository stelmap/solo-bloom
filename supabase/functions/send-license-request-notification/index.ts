import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'

/** Emails the Solo .Bizz admin about one discounted-license request owned by the caller. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const token = auth.replace('Bearer ', '')
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: auth } } })
    const { data: claims } = await userClient.auth.getClaims(token)
    const uid = claims?.claims?.sub
    if (!uid) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    const id = typeof body?.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(body.requestId) ? body.requestId : null
    if (!id) return json({ error: 'requestId is required' }, 400)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data: r } = await admin.from('license_requests').select('id, user_id, email, message, created_at').eq('id', id).maybeSingle()
    if (!r || r.user_id !== uid) return json({ error: 'not_found' }, 404)

    const result = await sendAppEmail('license-request-notification', 'info@solo-bizz.com', {
      idempotencyKey: `license-request-${r.id}`,
      templateData: { email: r.email, message: r.message, createdAt: r.created_at },
    })
    return json(result)
  } catch (e) {
    console.error('[send-license-request-notification]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
