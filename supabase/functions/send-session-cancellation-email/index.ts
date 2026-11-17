import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'

const LANGS = ['uk', 'en', 'pl', 'de', 'fr', 'ru']
const txt = (v: unknown, n: number) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim().slice(0, n) || undefined : undefined

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
    const appointmentId = typeof body?.appointmentId === 'string' ? body.appointmentId : null
    if (!appointmentId) return json({ error: 'appointmentId is required' }, 400)

    // Recipient is derived from the therapist's own appointment (RLS scoped).
    const { data: apt, error: aptErr } = await supabase
      .from('appointments')
      .select('id, client_id, scheduled_at, clients(name, email)')
      .eq('id', appointmentId)
      .maybeSingle()
    if (aptErr) return json({ error: 'lookup_failed' }, 400)
    const client = (apt as any)?.clients
    if (!client?.email) return json({ error: 'client_has_no_email' }, 400)

    const result = await sendAppEmail('session-cancellation', client.email, {
      idempotencyKey: `session-cancel-${appointmentId}`,
      templateData: {
        clientName: client.name,
        sessionDate: txt(body?.sessionDate, 60),
        sessionTime: txt(body?.sessionTime, 30),
        cancellationReason: txt(body?.cancellationReason, 300),
        language: LANGS.includes(body?.language) ? body.language : 'en',
      },
    })
    return json(result)
  } catch (e) {
    console.error('[send-session-cancellation-email]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
