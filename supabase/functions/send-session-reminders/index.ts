import { createClient } from 'npm:@supabase/supabase-js@2'

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
      clients!appointments_client_id_fkey(id, name, email, notification_preference, confirmation_required),
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

  for (const apt of appointments) {
    const client = apt.clients as any
    const service = apt.services as any

    if (!client) {
      console.warn('No client for appointment', apt.id)
      skippedCount++
      continue
    }

    // Skip if client doesn't want reminders
    if (client.notification_preference === 'no_reminder') {
      skippedCount++
      continue
    }

    // Skip if no email (Phase 2 is email only; Telegram is Phase 3)
    const wantsEmail = ['email_only', 'email_and_telegram'].includes(client.notification_preference)
    if (!wantsEmail || !client.email) {
      skippedCount++
      continue
    }

    // Get specialist name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('user_id', apt.user_id)
      .single()

    const specialistName = profile?.full_name || profile?.business_name || 'your specialist'

    // Format session date/time
    const scheduledDate = new Date(apt.scheduled_at)
    const sessionDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const sessionTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })

    // Build confirmation URL if client requires confirmation
    let confirmationUrl: string | undefined
    if (client.confirmation_required && apt.confirmation_status !== 'confirmed') {
      // Create a session_confirmation token
      const { data: confirmation, error: confError } = await supabase
        .from('session_confirmations')
        .insert({ appointment_id: apt.id })
        .select('token')
        .single()

      if (confError) {
        console.error('Failed to create confirmation token', confError)
      } else {
        // Use the published app URL for the confirmation link
        const appUrl = Deno.env.get('APP_URL') || `https://solo-bizz-app.lovable.app`
        confirmationUrl = `${appUrl}/confirm-session?token=${confirmation.token}`
      }

      // Mark confirmation_status as pending
      await supabase
        .from('appointments')
        .update({ confirmation_status: 'pending' } as any)
        .eq('id', apt.id)
    }

    // Send email via send-transactional-email
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
      console.error('Failed to send reminder', { appointmentId: apt.id, error: sendError })
      continue
    }

    // Update appointment status to reminder_sent
    await supabase
      .from('appointments')
      .update({ status: 'reminder_sent' } as any)
      .eq('id', apt.id)

    sentCount++
    console.log('Reminder sent', { appointmentId: apt.id, client: client.name })
  }

  console.log('Reminder job complete', { sent: sentCount, skipped: skippedCount })

  return new Response(
    JSON.stringify({ processed: appointments.length, sent: sentCount, skipped: skippedCount }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
