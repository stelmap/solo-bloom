import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'

/**
 * Internal notification for a new landing-page booking request. Called by the
 * database trigger on `booking_requests` with the service role key; the
 * template defines its own fixed recipient.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!serviceKey || token !== serviceKey) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    const requestId = typeof body?.requestId === 'string' ? body.requestId : null
    if (!requestId) return json({ error: 'requestId is required' }, 400)

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey)
    const { data: request, error } = await supabase
      .from('booking_requests')
      .select('id, name, email, phone, message, language, source, created_at')
      .eq('id', requestId)
      .maybeSingle()
    if (error) return json({ error: error.message }, 400)
    if (!request) return json({ error: 'booking_request_not_found' }, 404)

    const result = await sendAppEmail('booking-request-notification', 'info@solo-bizz.com', {
      idempotencyKey: `booking-${request.id}`,
      templateData: {
        name: request.name,
        email: request.email,
        phone: request.phone,
        message: request.message,
        language: request.language,
        source: request.source,
        created_at: request.created_at,
      },
    })
    return json(result)
  } catch (e) {
    console.error('[send-booking-request-notification]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
