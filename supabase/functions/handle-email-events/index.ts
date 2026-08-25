import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Notification-only bookkeeping: Lovable enforces suppression at send time.
// These rows only keep the app's own history surfaces up to date.
const REASON_MESSAGE: Record<string, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

const LOG_STATUS: Record<string, string> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

function db() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
}

async function record(reason: 'bounce' | 'complaint' | 'unsubscribe', recipient: string, eventId: string) {
  const supabase = db()
  const email = recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  if (suppressError) {
    console.error('Failed to record suppression', {
      event_id: eventId,
      code: suppressError.code,
      message: suppressError.message,
    })
    throw new Error('suppression_write_failed')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    template_name: 'system',
    recipient_email: email,
    status: LOG_STATUS[reason],
    error_message: REASON_MESSAGE[reason],
    metadata: null,
  })
  if (logError) {
    console.error('Failed to record email_send_log entry', {
      event_id: eventId,
      code: logError.code,
      message: logError.message,
    })
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record('bounce', event.data.recipient, event.event_id)
    },
    'email.complaint': async (event) => {
      await record('complaint', event.data.recipient, event.event_id)
    },
    'email.unsubscribed': async (event) => {
      await record('unsubscribe', event.data.recipient, event.event_id)
    },
  },
})

Deno.serve((req) => handler(req))
