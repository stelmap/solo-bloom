import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'

/**
 * Public endpoint for landing-page review submissions.
 *
 * Anonymous visitors call this without a JWT. All privileged work (looking up
 * the account behind the email, counting their sessions, rate limiting and
 * inserting the row) happens here with the service role, so the browser never
 * learns whether an email exists in the product.
 */

const PLANS = ['free_starter', 'solo_practice', 'pro_practice', 'unknown']
const MIN_BODY = 30
const MAX_BODY = 1000
const VERIFIED_MIN_RECORDS = 10

function sanitize(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const raw = await req.json().catch(() => null) as Record<string, unknown> | null
    if (!raw) return json({ error: 'invalid_body' }, 400)

    // Honeypot + minimum fill time: cheap anti-bot guard. Bots fill every field
    // and submit instantly; humans do not. Always answer with the neutral
    // success payload so scripts get no signal.
    const neutral = { ok: true }
    if (typeof raw.website === 'string' && raw.website.trim() !== '') return json(neutral)
    if (typeof raw.elapsedMs === 'number' && raw.elapsedMs < 3000) return json(neutral)

    const displayName = sanitize(String(raw.displayName ?? '')).slice(0, 80)
    const email = String(raw.email ?? '').trim().toLowerCase().slice(0, 254)
    const profession = sanitize(String(raw.profession ?? '')).slice(0, 80)
    const plan = PLANS.includes(String(raw.plan)) ? String(raw.plan) : null
    const rating = Number(raw.rating)
    const body = sanitize(String(raw.body ?? ''))
    const consent = raw.consent === true
    const language = typeof raw.language === 'string' ? raw.language.slice(0, 5) : null

    const errors: string[] = []
    if (displayName.length < 2) errors.push('displayName')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email')
    if (profession.length < 2) errors.push('profession')
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.push('rating')
    if (body.length < MIN_BODY || body.length > MAX_BODY) errors.push('body')
    if (!consent) errors.push('consent')
    if (errors.length) return json({ error: 'validation_failed', fields: errors }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const forwarded = req.headers.get('x-forwarded-for') ?? ''
    const ip = forwarded.split(',')[0].trim() || 'unknown'
    const ipHash = await sha256(`review:${ip}`)
    const bodyHash = await sha256(`${email}:${body.toLowerCase()}`)

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Rate limits: max 2 per email and 5 per IP in 24h, and no exact duplicates.
    const [{ count: emailCount }, { count: ipCount }, { count: dupCount }] = await Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('body_hash', bodyHash),
    ])
    if ((emailCount ?? 0) >= 2 || (ipCount ?? 0) >= 5) return json({ error: 'rate_limited' }, 429)
    if ((dupCount ?? 0) > 0) return json(neutral)

    // Verification: does this email belong to an active account with more than
    // ten sessions? The result never leaves the server in a form that reveals
    // account existence.
    let verificationStatus: 'verified' | 'not_verified' | 'verification_failed' = 'not_verified'
    let verifiedUserId: string | null = null
    let recordsCount = 0
    try {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const match = list?.users?.find((u) => (u.email ?? '').toLowerCase() === email)
      if (match) {
        verifiedUserId = match.id
        const { data: lifecycle } = await supabase
          .from('user_lifecycle')
          .select('status')
          .eq('user_id', match.id)
          .maybeSingle()
        const active = !lifecycle?.status || ['active', 'new'].includes(String(lifecycle.status))
        const { count } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', match.id)
        recordsCount = count ?? 0
        verificationStatus = active && recordsCount > VERIFIED_MIN_RECORDS ? 'verified' : 'not_verified'
      }
    } catch (e) {
      console.error('[submit-review] verification failed', (e as Error).message)
      verificationStatus = 'verification_failed'
    }

    const { data: inserted, error } = await supabase
      .from('reviews')
      .insert({
        display_name: displayName,
        email,
        profession,
        plan,
        rating,
        body,
        consent,
        language,
        verification_status: verificationStatus,
        verified_user_id: verifiedUserId,
        verified_records_count: recordsCount,
        verification_checked_at: new Date().toISOString(),
        moderation_status: 'pending',
        ip_hash: ipHash,
        body_hash: bodyHash,
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('[submit-review] insert failed', error.message)
      return json({ error: 'insert_failed' }, 500)
    }

    // Notifications must never block the neutral response.
    try {
      await sendAppEmail('review-admin-notification', 'info@solo-bizz.com', {
        idempotencyKey: `review-admin-${inserted.id}`,
        templateData: {
          display_name: displayName,
          email,
          profession,
          plan,
          rating,
          body,
          verification_status: verificationStatus,
          records_count: recordsCount,
          language,
          created_at: inserted.created_at,
        },
      })
    } catch (e) {
      console.error('[submit-review] admin notification failed', (e as Error).message)
    }

    try {
      await sendAppEmail('review-status-update', email, {
        idempotencyKey: `review-received-${inserted.id}`,
        templateData: { display_name: displayName, kind: 'received' },
      })
    } catch (e) {
      console.error('[submit-review] confirmation email failed', (e as Error).message)
    }

    return json(neutral)
  } catch (e) {
    console.error('[submit-review]', (e as Error).message)
    return json({ error: 'unexpected_error' }, 500)
  }
})
