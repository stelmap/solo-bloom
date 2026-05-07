import { createClient } from 'npm:@supabase/supabase-js@2'
import { tg, normalizeLang, formatSessionDateTime } from '../_shared/telegram.ts'

/**
 * Cron-triggered edge function that runs every hour.
 * Finds sessions scheduled ~24h from now, sends reminder emails
 * via the send-transactional-email function, and updates session status.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // With verify_jwt = true, Supabase gateway has already verified the JWT signature.
  // We still enforce that only service_role tokens (used by pg_cron) can invoke.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : ''

  try {
    const verifier = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await verifier.auth.getClaims(bearer)
    if (error || data?.claims?.role !== 'service_role') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars')
    return new Response(JSON.stringify({ error: 'Config error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Find appointments scheduled between 23 and 25 hours from now
  // that are still in "scheduled" status and client wants reminders
  const now = new Date()
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: appointments, error: fetchError } = await supabase
    .from('appointments')
    .select(`
      id, scheduled_at, duration_minutes, price, user_id,
      confirmation_status,
      clients!appointments_client_id_fkey(id, name, email, notification_preference, confirmation_required, telegram_chat_id, telegram_link_status),
      services!appointments_service_id_fkey(name)
    `)
    .in('status', ['scheduled'])
    .gte('scheduled_at', from.toISOString())
    .lte('scheduled_at', to.toISOString())

  if (fetchError) {
    console.error('Failed to fetch appointments', fetchError)
    return new Response(JSON.stringify({ error: 'DB error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!appointments || appointments.length === 0) {
    console.log('No appointments to remind')
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let sentCount = 0
  let skippedCount = 0
  let telegramCount = 0

  for (const apt of appointments) {
    const client = apt.clients as any
    const service = apt.services as any

    if (!client) {
      console.warn('No client for appointment', apt.id)
      skippedCount++
      continue
    }

    if (client.notification_preference === 'no_reminder') {
      skippedCount++
      continue
    }

    const wantsEmail = ['email_only', 'email_and_telegram'].includes(client.notification_preference)
    const wantsTelegram = ['telegram_only', 'email_and_telegram'].includes(client.notification_preference)

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, business_name, language')
      .eq('user_id', apt.user_id)
      .single()

    const specialistName = profile?.full_name || profile?.business_name || 'your specialist'
    const lang = normalizeLang(profile?.language)
    const { date: sessionDate, time: sessionTime } = formatSessionDateTime(apt.scheduled_at, lang)

    let confirmationUrl: string | undefined
    const needsConfirmation = client.confirmation_required && apt.confirmation_status !== 'confirmed'
    if (needsConfirmation) {
      const { data: confirmation, error: confError } = await supabase
        .from('session_confirmations')
        .insert({ appointment_id: apt.id })
        .select('token')
        .single()

      if (confError) {
        console.error('Failed to create confirmation token', confError)
      } else {
        const appUrl = Deno.env.get('APP_URL') || `https://solo-bizz-app.lovable.app`
        confirmationUrl = `${appUrl}/confirm-session?token=${confirmation.token}`
      }

      await supabase
        .from('appointments')
        .update({ confirmation_status: 'pending' } as any)
        .eq('id', apt.id)
    }

    // ---------- Email ----------
    if (wantsEmail && client.email) {
      const { error: sendError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'session-reminder',
          recipientEmail: client.email,
          idempotencyKey: `session-reminder-${apt.id}`,
          templateData: {
            clientName: client.name,
            specialistName,
            sessionDate,
            sessionTime,
            confirmationUrl,
          },
        },
      })
      if (sendError) {
        console.error('Failed to send email reminder', { appointmentId: apt.id, error: sendError })
      } else {
        sentCount++
      }
    }

    // ---------- Telegram ----------
    if (wantsTelegram && client.telegram_chat_id && client.telegram_link_status === 'connected') {
      const sessionType = (service?.name) ?? 'Session'
      const T = tg(lang)
      const params = { client: client.name, specialist: specialistName, date: sessionDate, time: sessionTime, type: sessionType }
      const baseText = needsConfirmation ? T.confirmation(params) : T.reminder(params)

      const reply_markup = needsConfirmation
        ? { inline_keyboard: [[
            { text: T.btnConfirm, callback_data: `confirm:${apt.id}` },
            { text: T.btnReschedule, callback_data: `reschedule:${apt.id}` },
          ]] }
        : undefined

      const { error: tgErr } = await supabase.functions.invoke('send-telegram-notification', {
        body: {
          client_id: client.id,
          appointment_id: apt.id,
          template_name: needsConfirmation ? 'session-confirmation' : 'session-reminder',
          text: baseText,
          reply_markup,
          idempotency_key: `session-reminder-24h:${apt.id}`,
        },
      })
      if (tgErr) console.error('Telegram send failed', { appointmentId: apt.id, error: tgErr })
      else telegramCount++
    }

    if (!wantsEmail && !wantsTelegram) {
      skippedCount++
      continue
    }

    await supabase
      .from('appointments')
      .update({ status: 'reminder_sent' } as any)
      .eq('id', apt.id)

    console.log('Reminder processed', { appointmentId: apt.id, client: client.name })
  }

  console.log('Reminder job complete', { sent: sentCount, telegram: telegramCount, skipped: skippedCount })

  return new Response(
    JSON.stringify({ processed: appointments.length, sent: sentCount, telegram: telegramCount, skipped: skippedCount }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
