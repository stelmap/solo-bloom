import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { getSubject, normalizeLang, type Lang } from '../_shared/email-templates/i18n.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = 'SoloBizz'
const SAMPLE_URL = 'https://example.com/auth/callback?token=preview-token'
const SAMPLE_EMAIL = 'user@example.com'
const SAMPLE_NEW_EMAIL = 'new-user@example.com'

function sampleProps(type: string, lang: Lang) {
  const base = {
    siteName: SITE_NAME,
    siteUrl: 'https://example.com',
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_URL,
    token: '123456',
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_NEW_EMAIL,
    lang,
  }
  return base
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isAdmin, error: roleErr } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    })
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const type = String(body.type ?? '')
    const lang: Lang = normalizeLang(body.lang ?? 'en')

    const Tpl = EMAIL_TEMPLATES[type]
    if (!Tpl) {
      return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const html = await renderAsync(React.createElement(Tpl, sampleProps(type, lang)))
    const text = await renderAsync(React.createElement(Tpl, sampleProps(type, lang)), { plainText: true })
    const subject = getSubject(type as any, lang)

    return new Response(JSON.stringify({ subject, html, text, type, lang }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('admin-preview-auth-email error', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
