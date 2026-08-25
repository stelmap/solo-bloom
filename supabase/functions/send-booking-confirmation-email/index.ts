import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'

/**
 * Sends the booking-confirmation email for one booking request. The recipient
 * is always read from the stored request row, never taken from the caller, so
 * the public booking page can trigger it without being able to email anyone
 * else.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body = await req.json().catch(() => null)
    const requestId = typeof body?.requestId === 'string' ? body.requestId : null
    if (!requestId) return json({ error: 'requestId is required' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { data: request, error: reqErr } = await supabase
      .from('session_booking_requests')
      .select('id, email, first_name, last_name, status')
      .eq('id', requestId)
      .maybeSingle()
    if (reqErr) return json({ error: reqErr.message }, 400)
    if (!request?.email) return json({ error: 'booking_request_not_found' }, 404)

    const fallbackName =
      `${request.first_name ?? ''}${request.last_name ? ' ' + request.last_name : ''}`.trim() || 'Client'

    const result = await sendAppEmail('booking-confirmation', request.email, {
      idempotencyKey: `booking-confirm-${request.id}`,
      templateData: {
        clientName: body?.clientName ?? fallbackName,
        specialistName: body?.specialistName,
        sessionDate: body?.sessionDate,
        sessionTime: body?.sessionTime,
        serviceName: body?.serviceName,
        language: body?.language ?? 'en',
      },
    })
    return json(result)
  } catch (e) {
    console.error('[send-booking-confirmation-email]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
