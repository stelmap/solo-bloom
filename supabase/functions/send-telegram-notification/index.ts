// Service-role only: send a Telegram message to a connected client and log the result.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { tgFetch } from '../_shared/telegram.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const auth = req.headers.get('Authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  try {
    const verifier = createClient(supabaseUrl, anonKey);
    const { data, error } = await verifier.auth.getClaims(bearer);
    if (error || data?.claims?.role !== 'service_role') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const body = await req.json();
  const { client_id, appointment_id, template_name, text, reply_markup, idempotency_key } = body || {};

  if (!client_id || !template_name || !text) {
    return new Response(JSON.stringify({ error: 'client_id, template_name and text required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Idempotency: if a successful send with this key already exists, skip.
  if (idempotency_key) {
    const { data: existing } = await supabase.from('telegram_send_log')
      .select('id, message_id')
      .eq('idempotency_key', idempotency_key)
      .eq('status', 'sent')
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, deduplicated: true, message_id: existing.message_id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  const { data: client } = await supabase.from('clients')
    .select('id, user_id, telegram_chat_id, telegram_link_status').eq('id', client_id).single();

  if (!client?.telegram_chat_id || client.telegram_link_status !== 'connected') {
    await supabase.from('telegram_send_log').insert({
      user_id: client?.user_id, client_id, appointment_id, template_name,
      status: 'failed', error_message: 'Telegram not connected for client',
      idempotency_key: idempotency_key ?? null,
    });
    return new Response(JSON.stringify({ ok: false, error: 'not_connected' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const res = await tgFetch('sendMessage', {
      chat_id: client.telegram_chat_id,
      text,
      parse_mode: 'HTML',
      ...(reply_markup ? { reply_markup } : {}),
    });
    const { error: insertErr } = await supabase.from('telegram_send_log').insert({
      user_id: client.user_id, client_id, appointment_id, template_name,
      chat_id: client.telegram_chat_id, status: 'sent',
      message_id: String(res.result?.message_id ?? ''),
      idempotency_key: idempotency_key ?? null,
    });
    // Unique-violation on idempotency_key means a concurrent send already logged success.
    if (insertErr && (insertErr as any).code === '23505') {
      return new Response(JSON.stringify({ ok: true, deduplicated: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await supabase.from('clients').update({ telegram_last_notification_at: new Date().toISOString() } as any).eq('id', client_id);
    return new Response(JSON.stringify({ ok: true, message_id: res.result?.message_id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const err = (e as Error).message;
    await supabase.from('telegram_send_log').insert({
      user_id: client.user_id, client_id, appointment_id, template_name,
      chat_id: client.telegram_chat_id, status: 'failed', error_message: err,
      idempotency_key: idempotency_key ?? null,
    });
    return new Response(JSON.stringify({ ok: false, error: err }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
