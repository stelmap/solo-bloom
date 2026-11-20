import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    const clientId = typeof body?.clientId === 'string' ? body.clientId : null
    const suppliedUrl = typeof body?.agreementUrl === 'string' ? body.agreementUrl : null
    if (!clientId || !suppliedUrl) return json({ error: 'clientId and agreementUrl are required' }, 400)

    // Only accept links to our own agreement page whose token belongs to an
    // invitation this therapist created for this client; the email link is rebuilt server-side.
    const ALLOWED_ORIGINS = ['https://solo-bizz.com', 'https://www.solo-bizz.com', 'https://solo-bizz.lovable.app', 'https://preview--solo-bizz.lovable.app']
    let parsed: URL
    try { parsed = new URL(suppliedUrl) } catch { return json({ error: 'invalid_agreement_url' }, 400) }
    const m = parsed.pathname.match(/^\/agreement\/([A-Za-z0-9_-]{16,200})$/)
    const originOk = ALLOWED_ORIGINS.includes(parsed.origin)
    if (!m || !originOk || parsed.search || parsed.hash) return json({ error: 'invalid_agreement_url' }, 400)
    const token = m[1]
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHash = Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, '0')).join('')
    const { data: inv } = await supabase
      .from('agreement_invitations')
      .select('id')
      .eq('token_hash', tokenHash)
      .eq('client_id', clientId)
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (!inv) return json({ error: 'invalid_agreement_url' }, 400)
    const agreementUrl = `${parsed.origin}/agreement/${token}`

    // Recipient always comes from the therapist's own client record (RLS scoped).
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('name, email')
      .eq('id', clientId)
      .maybeSingle()
    if (clientErr) return json({ error: clientErr.message }, 400)
    if (!client?.email) return json({ error: 'client_has_no_email' }, 400)

    const result = await sendAppEmail('agreement-invitation', client.email, {
      idempotencyKey: `agreement-invite-${agreementUrl.split('/').pop()}`,
      templateData: {
        clientName: body?.clientName ?? client.name,
        specialistName: body?.specialistName,
        agreementUrl,
        language: body?.language ?? 'en',
      },
    })
    return json(result)
  } catch (e) {
    console.error('[send-agreement-invitation-email]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
