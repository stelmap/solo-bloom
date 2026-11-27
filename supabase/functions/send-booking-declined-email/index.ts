import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'
import { formatSlot, isLang, ownerContext } from '../_shared/meeting-email-context.ts'

/**
 * Tells a client their booking request was not confirmed. Only the signed-in
 * owner of the request may trigger it, only after it was declined (not marked
 * as spam), and the recipient is always the stored request email.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await supabase.auth.getUser(authHeader.slice(7))
    if (!userData?.user) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    const requestId = typeof body?.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(body.requestId) ? body.requestId : null
    if (!requestId) return json({ error: 'requestId is required' }, 400)

    // RLS limits this read to the caller's own requests.
    const { data: request } = await supabase.from('session_booking_requests')
      .select('id, user_id, email, status, requested_slot_at').eq('id', requestId).maybeSingle()
    if (!request || request.user_id !== userData.user.id) return json({ error: 'booking_request_not_found' }, 404)
    if (request.status !== 'cancelled_therapist') return json({ skipped: 'status' })
    if (!request.email) return json({ skipped: 'no_email' })

    const lang = isLang(body?.language) ? body.language : 'en'
    const ctx = await ownerContext(supabase, request.user_id, lang)
    const result = await sendAppEmail('booking-declined', request.email, {
      idempotencyKey: `booking-declined-${request.id}`,
      templateData: {
        specialistName: ctx.specialistName,
        ...formatSlot(request.requested_slot_at, lang),
        timezone: ctx.timezone,
        bookingUrl: ctx.bookingUrl,
        language: lang,
      },
    })
    return json(result)
  } catch (e) {
    console.error('[send-booking-declined-email]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
