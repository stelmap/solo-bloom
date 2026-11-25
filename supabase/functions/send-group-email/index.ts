import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'

const LANGS = ['uk', 'en', 'pl', 'de', 'fr', 'ru']
const clean = (v: unknown, n: number) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, n) || undefined : undefined
const httpsLink = (v: unknown) => { const s = clean(v, 1000); try { return s && new URL(s).protocol === 'https:' ? s : undefined } catch { return undefined } }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'unauthorized' }, 401)
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: u } = await sb.auth.getUser()
    if (!u?.user) return json({ error: 'unauthorized' }, 401)
    const body = await req.json().catch(() => null)
    const language = LANGS.includes(body?.language) ? body.language : 'en'

    if (body?.kind === 'decision') {
      // RLS: only the owner can read their registration.
      const { data: r } = await sb.from('group_registrations')
        .select('id, status, person_name, email, groups(name, participant_instructions)')
        .eq('id', String(body.registrationId ?? '')).maybeSingle()
      if (!r) return json({ error: 'not_found' }, 404)
      if (!['confirmed', 'rejected', 'waitlisted'].includes(r.status)) return json({ error: 'invalid_status' }, 400)
      const g = (r as any).groups
      const res = await sendAppEmail('group-message', r.email, {
        idempotencyKey: `group-reg-${r.id}-${r.status}`,
        templateData: { kind: r.status, language, name: r.person_name, groupName: g?.name, instructions: r.status === 'confirmed' ? g?.participant_instructions : undefined },
      })
      return json({ sent: res.sent ? 1 : 0 })
    }

    if (body?.kind === 'message') {
      const subject = clean(body.subject, 150), message = clean(body.message, 5000), link = httpsLink(body.link)
      if (!subject || !message) return json({ error: 'subject_and_message_required' }, 400)
      if (body.link && !link) return json({ error: 'link_must_be_https' }, 400)
      const { data: g } = await sb.from('groups').select('id, name').eq('id', String(body.groupId ?? '')).maybeSingle()
      if (!g) return json({ error: 'not_found' }, 404)
      const { data: members } = await sb.from('group_members').select('client_id, clients(name, email)').eq('group_id', g.id).is('left_at', null)
      const batch = crypto.randomUUID()
      let sent = 0, skipped = 0
      for (const m of members ?? []) {
        const c = (m as any).clients
        if (!c?.email) { skipped++; continue }
        try {
          const r = await sendAppEmail('group-message', c.email, {
            idempotencyKey: `group-msg-${batch}-${m.client_id}`,
            templateData: { kind: 'message', language, name: c.name, groupName: g.name, subject, message, link },
          })
          if (r.sent) sent++; else skipped++
        } catch (e) { console.error('[send-group-email] member failed', (e as Error).message); skipped++ }
      }
      return json({ sent, skipped })
    }
    return json({ error: 'invalid_kind' }, 400)
  } catch (e) {
    console.error('[send-group-email]', (e as Error).message)
    return json({ error: 'internal_error' }, 500)
  }
})
