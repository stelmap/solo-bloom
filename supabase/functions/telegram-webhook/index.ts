// Telegram webhook: handles /start <token> linking, confirm/reschedule callbacks.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { tgFetch, deriveTelegramWebhookSecret, tg, normalizeLang } from '../_shared/telegram.ts';

async function langForUserId(supabase: any, userId: string | null | undefined) {
  if (!userId) return 'en';
  const { data } = await supabase.from('profiles').select('language').eq('user_id', userId).maybeSingle();
  return normalizeLang(data?.language);
}
async function langForAppointmentId(supabase: any, appointmentId: string) {
  const { data } = await supabase.from('appointments').select('user_id').eq('id', appointmentId).maybeSingle();
  return langForUserId(supabase, data?.user_id);
}

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const expected = await deriveTelegramWebhookSecret();
    const actual = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (!safeEqual(actual, expected)) return new Response('Unauthorized', { status: 401 });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const update = await req.json();

    // Callback queries (Confirm / Reschedule buttons)
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id?.toString();
      const data: string = cq.data || '';
      const [action, appointmentId] = data.split(':');

      if (action === 'confirm' && appointmentId) {
        await supabase.from('appointments').update({
          status: 'confirmed',
          confirmation_status: 'confirmed',
          confirmation_timestamp: new Date().toISOString(),
        } as any).eq('id', appointmentId);
        await supabase.from('telegram_send_log').insert({
          appointment_id: appointmentId, chat_id: chatId, template_name: 'confirmation_response',
          status: 'confirmed', metadata: { source: 'telegram' },
        });
        await tgFetch('answerCallbackQuery', { callback_query_id: cq.id, text: 'Confirmed ✓' });
        await tgFetch('sendMessage', { chat_id: chatId, text: 'Thank you. Your session has been confirmed.' });
      } else if (action === 'reschedule' && appointmentId) {
        const { data: apt } = await supabase.from('appointments')
          .select('id, notes').eq('id', appointmentId).single();
        const note = `[${new Date().toISOString()}] Client requested reschedule via Telegram.`;
        await supabase.from('appointments').update({
          notes: apt?.notes ? `${apt.notes}\n${note}` : note,
        } as any).eq('id', appointmentId);
        await supabase.from('telegram_send_log').insert({
          appointment_id: appointmentId, chat_id: chatId, template_name: 'reschedule_request',
          status: 'reschedule_requested',
        });
        await tgFetch('answerCallbackQuery', { callback_query_id: cq.id, text: 'Noted' });
        await tgFetch('sendMessage', { chat_id: chatId, text: 'Thank you. Your therapist has been notified that you may need to reschedule.' });
      }
      return new Response(JSON.stringify({ ok: true }));
    }

    const message = update.message ?? update.edited_message;
    const chatId = message?.chat?.id;
    const text: string = message?.text || '';

    if (chatId && text.startsWith('/start')) {
      const parts = text.split(/\s+/);
      const token = parts[1];
      if (!token) {
        await tgFetch('sendMessage', { chat_id: chatId, text: 'Welcome! Please use the personalized link from your therapist to connect.' });
        return new Response(JSON.stringify({ ok: true }));
      }
      const { data: client } = await supabase.from('clients')
        .select('id, name, user_id').eq('telegram_link_token', token).maybeSingle();
      if (!client) {
        await tgFetch('sendMessage', { chat_id: chatId, text: 'This invitation link is invalid or has expired. Please request a new one from your therapist.' });
        return new Response(JSON.stringify({ ok: true }));
      }
      await supabase.from('clients').update({
        telegram_chat_id: chatId.toString(),
        telegram_link_status: 'connected',
        telegram_linked_at: new Date().toISOString(),
      } as any).eq('id', client.id);
      await tgFetch('sendMessage', { chat_id: chatId, text: `Hello ${client.name}! ✅ You are now connected. You will receive session reminders and confirmation requests here.` });
      return new Response(JSON.stringify({ ok: true }));
    }

    return new Response(JSON.stringify({ ok: true, ignored: true }));
  } catch (e) {
    console.error('webhook error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
