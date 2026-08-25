import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail, type SendTemplateEmailOptions, type SendTemplateEmailResult } from './send-email.ts'

/**
 * Server-only wrapper around `sendTemplateEmail` that keeps the project's
 * `email_send_log` history populated (the same rows the legacy queue used to
 * write). Delivery, retries, rate limits and suppression are handled by
 * Lovable's managed email API — this only records the outcome for the app's
 * own reporting surfaces.
 */
export async function sendAppEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const messageId = crypto.randomUUID()
  const log = async (status: string, errorMessage?: string) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      const { error } = await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: to,
        status,
        error_message: errorMessage ?? null,
      })
      if (error) console.error('[send-and-log] could not write email_send_log', error.message)
    } catch (e) {
      console.error('[send-and-log] could not write email_send_log', (e as Error).message)
    }
  }

  try {
    const result = await sendTemplateEmail(templateName, to, options)
    if (result.sent) {
      await log('sent')
    } else {
      await log('suppressed', 'Recipient is suppressed')
    }
    return result
  } catch (e) {
    await log('failed', (e as Error).message)
    throw e
  }
}
