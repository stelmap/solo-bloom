import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

/**
 * Solo .Bizz AI helpdesk backend.
 *
 * One endpoint serves every surface (in-app widget, landing page widget,
 * error-triggered help). It is deliberately provider-agnostic: the UI only
 * knows about `action`, never about the model or the knowledge base storage.
 *
 * Privacy: the browser only ever sends technical context (page path, module,
 * error code, language). Client names, session/therapy notes, documents and
 * payment data are never read here and never sent to the model.
 */

const MODEL = 'openai/gpt-6-astra'

const CATEGORIES = [
  'Authentication', 'Onboarding', 'Dashboard', 'Calendar', 'Clients', 'Groups',
  'Services', 'Booking', 'Payments', 'Finances', 'Subscription', 'Notifications',
  'Settings', 'Localization', 'Bug/Error', 'Feature request', 'Other',
] as const

const LANG_NAME: Record<string, string> = {
  en: 'English', uk: 'Ukrainian', pl: 'Polish', fr: 'French', ru: 'Russian',
}

const MAX_MESSAGE = 2000
const MAX_HISTORY = 16

function clean(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
  return trimmed ? trimmed.slice(0, max) : null
}

type Ctx = {
  module?: string | null
  pagePath?: string | null
  action?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  appVersion?: string | null
}

/** Accumulate a streamed /v1/responses call into plain text. */
async function askModel(apiKey: string, system: string, input: unknown[]): Promise<string> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': apiKey,
      'X-Lovable-AIG-SDK': 'fetch',
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: system,
      input,
      stream: true,
      store: false,
      reasoning: { effort: 'low' },
      text: {
        format: {
          type: 'json_schema',
          name: 'support_answer',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['answer', 'category', 'resolved', 'actions'],
            properties: {
              answer: { type: 'string' },
              category: { type: 'string', enum: CATEGORIES as unknown as string[] },
              resolved: { type: 'boolean' },
              actions: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['label', 'route'],
                  properties: {
                    label: { type: 'string' },
                    route: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    }),
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    const err = new Error(`gateway_${res.status}`)
    ;(err as any).status = res.status
    ;(err as any).detail = detail.slice(0, 500)
    throw err
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const evt = JSON.parse(payload)
        if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
          text += evt.delta
        } else if (evt.type === 'response.completed' && !text) {
          text = evt.response?.output_text ?? ''
        }
      } catch {
        /* partial event — ignored */
      }
    }
  }
  return text
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
    const body = await req.json().catch(() => null) as Record<string, any> | null
    if (!body) return json({ error: 'invalid_body' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // Identify the caller when a session is present; anonymous visitors are fine.
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const { data } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = data.user?.id ?? null
    }

    const action = clean(body.action, 40) ?? 'chat'
    const conversationId = clean(body.conversationId, 64)

    /* ---------------- feedback ---------------- */
    if (action === 'feedback') {
      if (!conversationId) return json({ error: 'missing_conversation' }, 400)
      const helpful = body.helpful === true
      await admin.from('support_conversations').update({
        feedback: helpful ? 'helpful' : 'not_helpful',
        feedback_comment: clean(body.comment, 1000),
      }).eq('id', conversationId)
      return json({ ok: true })
    }

    /* ---------------- report a problem ---------------- */
    if (action === 'report') {
      if (!conversationId) return json({ error: 'missing_conversation' }, 400)
      const { data: conv } = await admin.from('support_conversations')
        .select('*').eq('id', conversationId).maybeSingle()
      const { data: msgs } = await admin.from('support_messages')
        .select('role, content').eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      const lastUser = [...(msgs ?? [])].reverse().find((m) => m.role === 'user')
      const lastBot = [...(msgs ?? [])].reverse().find((m) => m.role === 'assistant')

      const { data: issue, error } = await admin.from('support_issues').insert({
        conversation_id: conversationId,
        user_id: userId,
        description: clean(body.description, 2000),
        question: lastUser?.content?.slice(0, 2000) ?? null,
        bot_answer: lastBot?.content?.slice(0, 4000) ?? null,
        category: conv?.category ?? null,
        module: conv?.module ?? null,
        page_path: conv?.page_path ?? null,
        error_code: conv?.error_code ?? null,
        language: conv?.language ?? null,
        user_agent: clean(req.headers.get('user-agent'), 300),
      }).select('id').single()
      if (error) return json({ error: 'report_failed' }, 500)

      await admin.from('support_conversations')
        .update({ escalated: true }).eq('id', conversationId)
      return json({ ok: true, issueId: issue.id })
    }

    /* ---------------- chat ---------------- */
    const message = clean(body.message, MAX_MESSAGE)
    if (!message) return json({ error: 'empty_message' }, 400)

    const language = clean(body.language, 5) ?? 'en'
    const ctx: Ctx = {
      module: clean(body.context?.module, 60),
      pagePath: clean(body.context?.pagePath, 200),
      action: clean(body.context?.action, 120),
      errorCode: clean(body.context?.errorCode, 80),
      errorMessage: clean(body.context?.errorMessage, 300),
      appVersion: clean(body.context?.appVersion, 60),
    }
    const surface = clean(body.surface, 20) ?? 'app'
    const anonId = clean(body.anonId, 64)

    // Conversation row — created on the first message of a session.
    let convId = conversationId
    if (!convId) {
      const { data, error } = await admin.from('support_conversations').insert({
        user_id: userId,
        anon_id: userId ? null : anonId,
        surface,
        language,
        module: ctx.module,
        page_path: ctx.pagePath,
        error_code: ctx.errorCode,
        error_connected: Boolean(ctx.errorCode || ctx.errorMessage),
        first_question: message.slice(0, 500),
      }).select('id').single()
      if (error || !data) return json({ error: 'conversation_failed' }, 500)
      convId = data.id
    }

    const { data: history } = await admin.from('support_messages')
      .select('role, content').eq('conversation_id', convId)
      .order('created_at', { ascending: true }).limit(MAX_HISTORY)

    await admin.from('support_messages').insert({
      conversation_id: convId, role: 'user', content: message,
    })

    // Knowledge base — the bot answers from these articles first.
    const { data: articles } = await admin.from('support_articles')
      .select('module, title, body, language')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .limit(120)

    const kb = (articles ?? [])
      .map((a) => `## [${a.module}] ${a.title}\n${a.body}`)
      .join('\n\n')
      .slice(0, 60000)

    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) return json({ error: 'ai_unavailable' }, 500)

    const system = [
      'You are the Solo .Bizz in-product support assistant. Solo .Bizz is a CRM for',
      'psychologists, therapists, coaches and tutors.',
      '',
      'RULES:',
      `- Answer in ${LANG_NAME[language] ?? 'English'} only.`,
      '- Answer ONLY from the KNOWLEDGE BASE below plus the navigation it describes.',
      '- NEVER invent features, buttons, pages or settings. If the knowledge base does',
      '  not confirm something, say you do not have enough information to confirm how it',
      '  works in Solo .Bizz and suggest reporting the problem.',
      '- Keep answers short. Structure: a one-line explanation of what happens, then a',
      '  numbered step-by-step list using the real navigation, e.g. "Clients → open the',
      '  client → Sessions → Create session".',
      '- For errors: explain what probably happened, what to check, what to try, and',
      '  whether it looks like a system problem. Never mention stack traces, database',
      '  internals, tokens or keys.',
      '- `actions` may contain up to 3 in-app deep links using ONLY these routes:',
      '  /dashboard, /calendar, /clients, /groups, /services, /finances,',
      '  /finances/income, /finances/expenses, /booking-inbox, /settings,',
      '  /settings/practice, /calendar/settings, /finances/settings, /plans.',
      '  Use an empty array for website visitors who are not signed in.',
      '- `resolved` is false when you could not confirm an answer.',
      '',
      'USER CONTEXT (technical only):',
      `- surface: ${surface}`,
      `- page: ${ctx.pagePath ?? 'unknown'}`,
      `- module: ${ctx.module ?? 'unknown'}`,
      `- action: ${ctx.action ?? 'none'}`,
      `- error code: ${ctx.errorCode ?? 'none'}`,
      `- error message: ${ctx.errorMessage ?? 'none'}`,
      `- app version: ${ctx.appVersion ?? 'unknown'}`,
      '',
      'KNOWLEDGE BASE:',
      kb || '(empty — say you cannot confirm anything and offer to report the problem)',
    ].join('\n')

    const input = [
      ...(history ?? []).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: [{ type: m.role === 'user' ? 'input_text' : 'output_text', text: m.content }],
      })),
      { role: 'user', content: [{ type: 'input_text', text: message }] },
    ]

    let parsed: { answer: string; category: string; resolved: boolean; actions: { label: string; route: string }[] }
    try {
      const raw = await askModel(apiKey, system, input)
      parsed = JSON.parse(raw)
    } catch (err) {
      const status = (err as any)?.status
      console.error('[support-chat] model error', status, (err as any)?.detail ?? err)
      if (status === 429) return json({ error: 'rate_limited' }, 429)
      if (status === 402) return json({ error: 'ai_credits' }, 402)
      return json({ error: 'ai_failed', conversationId: convId }, 502)
    }

    const answer = String(parsed.answer ?? '').slice(0, 4000)
    const category = CATEGORIES.includes(parsed.category as any) ? parsed.category : 'Other'
    const actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3) : []

    await admin.from('support_messages').insert({
      conversation_id: convId, role: 'assistant', content: answer,
    })
    await admin.from('support_conversations').update({
      category,
      resolved_by_bot: parsed.resolved === true,
      message_count: (history?.length ?? 0) + 2,
      module: ctx.module ?? undefined,
      language,
    }).eq('id', convId)

    return json({ conversationId: convId, answer, category, resolved: parsed.resolved === true, actions })
  } catch (err) {
    console.error('[support-chat] unexpected', err)
    return json({ error: 'unexpected' }, 500)
  }
})
