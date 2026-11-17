import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'
import { canTriggerBookingConfirmation } from './trigger-access.ts'

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
    const requestId = typeof body?.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(body.requestId) ? body.requestId : null
    if (!requestId) return json({ error: 'requestId is required' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { data: request, error: reqErr } = await supabase
      .from('session_booking_requests')
      .select('id, user_id, email, first_name, last_name, status, created_at, requested_slot_at')
      .eq('id', requestId)
      .maybeSingle()
    if (reqErr) return json({ error: 'lookup_failed' }, 400)
    if (!request?.email) return json({ error: 'booking_request_not_found' }, 404)
    // Manual approval/retry may happen much later. Verify the caller with Auth,
    // never trust a caller-supplied owner ID or an unverified JWT payload.
    const authHeader = req.headers.get('Authorization')
    let verifiedUserId: string | undefined
    if (authHeader?.startsWith('Bearer ')) {
      const { data, error } = await supabase.auth.getUser(authHeader.slice(7))
      if (!error) verifiedUserId = data.user?.id
    }
    // Public auto-confirmation retains its short window; stored recipients,
    // permitted statuses and the delivery idempotency key remain unchanged.
    if (!canTriggerBookingConfirmation(request, verifiedUserId)) return json({ error: 'too_old' }, 409)
    if (!['pending', 'confirmed', 'needs_linking'].includes(request.status)) return json({ skipped: 'status' })
    const { data: owner } = await supabase.from('profiles')
      .select('full_name, business_name, language').eq('user_id', request.user_id).maybeSingle()
    const LOC: Record<string, string> = { uk: 'uk-UA', en: 'en-GB', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR', ru: 'ru-RU' }
    const reqLang = typeof body?.language === 'string' && LOC[body.language] ? body.language : (LOC[(owner as any)?.language ?? ''] ? (owner as any).language : 'en')
    const slot = new Date(request.requested_slot_at)

    const fallbackName =
      `${request.first_name ?? ''}${request.last_name ? ' ' + request.last_name : ''}`.trim() || 'Client'

    const result = await sendAppEmail('booking-confirmation', request.email, {
      idempotencyKey: `booking-confirm-${request.id}`,
      templateData: {
        clientName: fallbackName,
        specialistName: (owner as any)?.full_name || (owner as any)?.business_name || undefined,
        sessionDate: slot.toLocaleDateString(LOC[reqLang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
        sessionTime: slot.toLocaleTimeString(LOC[reqLang], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        language: reqLang,
      },
    })
    return json(result)
  } catch (e) {
    console.error('[send-booking-confirmation-email]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
