// Generates a secure deep-link for a client to connect their Telegram.
// Authenticated user-only; client must belong to the user.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { TELEGRAM_BOT_USERNAME } from '../_shared/telegram.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const auth = req.headers.get('Authorization') || '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { client_id } = await req.json();
    if (!client_id || typeof client_id !== 'string') {
      return new Response(JSON.stringify({ error: 'client_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: client, error: cErr } = await admin
      .from('clients').select('id, user_id, telegram_link_token, telegram_link_status').eq('id', client_id).single();
    if (cErr || !client || client.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let token2 = client.telegram_link_token;
    if (!token2 || client.telegram_link_status === 'failed') {
      // Generate URL-safe random token
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      token2 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      await admin.from('clients').update({
        telegram_link_token: token2,
        telegram_link_status: 'invitation_sent',
      } as any).eq('id', client_id);
    }

    const link = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token2}`;
    return new Response(JSON.stringify({ link, token: token2, bot_username: TELEGRAM_BOT_USERNAME }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('telegram-link error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
