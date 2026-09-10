import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-and-log.ts'

/**
 * Admin-only: notifies the review author that their review was published or
 * declined. The caller's JWT is validated in code and the admin role is checked
 * against `user_roles` before anything is sent.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) return json({ error: 'unauthorized' }, 401)

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const { data: userData, error: userError } = await service.auth.getUser(token)
    if (userError || !userData?.user) return json({ error: 'unauthorized' }, 401)

    const { data: isAdmin } = await service.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
    if (!isAdmin) return json({ error: 'forbidden' }, 403)

    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    const reviewId = typeof body?.reviewId === 'string' ? body.reviewId : null
    const kind = body?.kind === 'approved' || body?.kind === 'rejected' ? body.kind : null
    const message = typeof body?.message === 'string' ? body.message.slice(0, 1000) : undefined
    if (!reviewId || !kind) return json({ error: 'invalid_body' }, 400)

    const { data: review, error } = await service
      .from('reviews')
      .select('id, email, display_name')
      .eq('id', reviewId)
      .maybeSingle()
    if (error) return json({ error: error.message }, 400)
    if (!review) return json({ error: 'review_not_found' }, 404)

    const result = await sendAppEmail('review-status-update', review.email, {
      idempotencyKey: `review-${kind}-${review.id}`,
      templateData: { display_name: review.display_name, kind, message },
    })
    return json(result)
  } catch (e) {
    console.error('[notify-review-status]', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
