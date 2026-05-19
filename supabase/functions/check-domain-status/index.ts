import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const HOSTS = [
  { host: 'solo-bizz.com', url: 'https://solo-bizz.com/' },
  { host: 'www.solo-bizz.com', url: 'https://www.solo-bizz.com/' },
] as const

type ProbeResult = {
  host: string
  url: string
  state: 'active' | 'unreachable'
  status_code?: number
  latency_ms: number
  error?: string
}

async function probe(host: string, url: string): Promise<ProbeResult> {
  const started = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    // Manual redirects so an apex 301 → www counts as "active" for the apex too.
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: controller.signal })
    const latency = Date.now() - started
    const code = res.status
    // 2xx, 3xx → reachable. Any 4xx/5xx from the edge is treated as down.
    const ok = code >= 200 && code < 400
    return {
      host, url,
      state: ok ? 'active' : 'unreachable',
      status_code: code,
      latency_ms: latency,
      error: ok ? undefined : `HTTP ${code}`,
    }
  } catch (err) {
    return {
      host, url,
      state: 'unreachable',
      latency_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const results: Array<ProbeResult & { previous_state: string; transitioned: boolean; emailed: boolean }> = []

  for (const target of HOSTS) {
    const result = await probe(target.host, target.url)
    const checkedAt = new Date().toISOString()

    const { data: prev } = await supabase
      .from('domain_status_checks')
      .select('last_state')
      .eq('host', target.host)
      .maybeSingle()

    const previousState = (prev?.last_state ?? 'unknown') as 'active' | 'unreachable' | 'unknown'
    const transitioned = previousState !== 'unknown' && previousState !== result.state

    // Upsert latest probe. last_transition_at only moves when the state actually changes.
    const updatePayload: Record<string, unknown> = {
      host: target.host,
      last_state: result.state,
      last_status_code: result.status_code ?? null,
      last_latency_ms: result.latency_ms,
      last_error: result.error ?? null,
      last_checked_at: checkedAt,
    }
    if (transitioned || previousState === 'unknown') {
      updatePayload.last_transition_at = checkedAt
    }

    const { error: upsertErr } = await supabase
      .from('domain_status_checks')
      .upsert(updatePayload, { onConflict: 'host' })
    if (upsertErr) console.error('upsert error', upsertErr)

    let emailed = false
    if (transitioned) {
      try {
        const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'domain-status-alert',
            recipientEmail: 'o.gilevich@gmail.com',
            idempotencyKey: `domain-alert-${target.host}-${checkedAt}`,
            templateData: {
              host: target.host,
              url: target.url,
              previous_state: previousState,
              current_state: result.state,
              status_code: result.status_code,
              error: result.error,
              latency_ms: result.latency_ms,
              checked_at: checkedAt,
            },
          },
        })
        if (sendErr) {
          console.error('email send error', sendErr)
        } else {
          emailed = true
        }
      } catch (e) {
        console.error('email invoke threw', e)
      }
    }

    results.push({ ...result, previous_state: previousState, transitioned, emailed })
  }

  return new Response(JSON.stringify({ checked_at: new Date().toISOString(), results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})
