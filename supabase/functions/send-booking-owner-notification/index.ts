import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'

/**
 * Notifies the specialist whose booking link was used about a new public
 * booking. Only a request ID is accepted; recipient and details come from the
 * stored rows, and only recent requests qualify, so callers cannot email
 * arbitrary people. The idempotency key guarantees one email per booking.
 */
const LOCALES: Record<string, string> = { uk: 'uk-UA', en: 'en-GB', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR', ru: 'ru-RU' }
const APP_URL = 'https://solo-bizz.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json().catch(() => null)
    const requestId = typeof body?.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(body.requestId) ? body.requestId : null
    if (!requestId) return json({ error: 'requestId is required' }, 400)

    const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data: r, error } = await sb.from('session_booking_requests')
      .select('id, user_id, appointment_id, first_name, last_name, email, phone, comment, requested_slot_at, duration_minutes, status, created_at')
      .eq('id', requestId).maybeSingle()
    if (error) return json({ error: 'lookup_failed' }, 400)
    if (!r) return json({ error: 'booking_request_not_found' }, 404)
    if (Date.now() - new Date(r.created_at).getTime() > 10 * 60 * 1000) return json({ error: 'too_old' }, 409)
    if (!['pending', 'confirmed', 'needs_linking'].includes(r.status)) return json({ skipped: 'status', status: r.status })

    const [{ data: owner }, { data: profile }, apptRes] = await Promise.all([
      sb.auth.admin.getUserById(r.user_id),
      sb.from('profiles').select('language, currency').eq('user_id', r.user_id).maybeSingle(),
      r.appointment_id
        ? sb.from('appointments').select('price, duration_minutes, services(name)').eq('id', r.appointment_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    const to = owner?.user?.email
    if (!to) return json({ error: 'owner_email_missing' }, 404)

    const appt = apptRes.data as any
    const lang = LOCALES[profile?.language ?? ''] ? profile!.language! : 'en'
    const loc = LOCALES[lang]
    // Stored times are practice wall clocks labelled UTC.
    const start = new Date(r.requested_slot_at)
    const duration = appt?.duration_minutes ?? r.duration_minutes ?? 0
    const end = new Date(start.getTime() + duration * 60000)
    const tf = (d: Date) => d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    const price = appt?.price != null && Number(appt.price) > 0
      ? new Intl.NumberFormat(loc, { style: 'currency', currency: profile?.currency || 'EUR' }).format(Number(appt.price))
      : undefined

    const result = await sendAppEmail('booking-owner-notification', to, {
      idempotencyKey: `booking-owner-${r.id}`,
      templateData: {
        language: lang,
        clientName: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Client',
        date: start.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
        time: duration ? `${tf(start)} – ${tf(end)}` : tf(start),
        serviceName: appt?.services?.name ?? undefined,
        duration: duration || undefined,
        price,
        contact: [r.email, r.phone].filter(Boolean).join(' · ') || undefined,
        comment: r.comment || undefined,
        status: r.status,
        url: r.appointment_id ? `${APP_URL}/calendar?appointmentId=${r.appointment_id}` : `${APP_URL}/calendar`,
      },
    })
    return json(result)
  } catch (e) {
    console.error('[send-booking-owner-notification]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
