import * as React from 'npm:react@18.3.1'
import { RecoveryEmail } from '../supabase/functions/_shared/email-templates/recovery.tsx'
import { InviteEmail } from '../supabase/functions/_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../supabase/functions/_shared/email-templates/magic-link.tsx'
import { EmailChangeEmail } from '../supabase/functions/_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../supabase/functions/_shared/email-templates/reauthentication.tsx'
import { renderEmailPreview } from '../supabase/functions/_shared/email-templates/render-preview.ts'
import { normalizeLang } from '../supabase/functions/_shared/email-templates/i18n.ts'

const languages = ['uk', 'en', 'pl', 'de', 'fr', 'ru']
const confirmationUrl = 'https://solo-bizz.com/auth?token_hash=synthetic-check&type=recovery'
const props = { siteName: 'Solo .Bizz', siteUrl: 'https://solo-bizz.com', confirmationUrl }

Deno.test('account emails retain the supplied action URL in every language', () => {
  for (const language of languages) {
    for (const template of [RecoveryEmail, InviteEmail, MagicLinkEmail, EmailChangeEmail]) {
      const html = renderEmailPreview(React.createElement(template, {
        ...props, oldEmail: 'old@example.test', email: 'new@example.test', newEmail: 'new@example.test', language,
      }))
      const links = Array.from(html.matchAll(/href="([^"]+)"/g), (match) => match[1].replaceAll('&amp;', '&'))
      if (!links.includes(confirmationUrl)) throw new Error(`Action destination lost: ${template.name}/${language}`)
      if (html.includes('\ufffd')) throw new Error(`Unicode corruption: ${template.name}/${language}`)
    }
  }
})

Deno.test('recovery and identity emails preserve supplied one-time codes including leading zeros', () => {
  for (const language of languages) {
    for (const template of [RecoveryEmail, ReauthenticationEmail]) {
      const html = renderEmailPreview(React.createElement(template, { ...props, language, token: '001234' }))
      if (!html.includes('001234')) throw new Error(`Code changed: ${template.name}/${language}`)
    }
  }
})

Deno.test('email changes preserve old and new addresses even when recipient is the new address', () => {
  for (const language of languages) {
    const html = renderEmailPreview(React.createElement(EmailChangeEmail, {
      ...props, language, oldEmail: 'previous@example.test', email: 'next@example.test', newEmail: 'next@example.test',
    }))
    if (!html.includes('previous@example.test') || !html.includes('next@example.test')) throw new Error(`Address lost: ${language}`)
  }
})

Deno.test('German account language recognizes regional settings rather than English fallback', () => {
  if (normalizeLang('de-DE') !== 'de' || normalizeLang('de') !== 'de') throw new Error('German language missing')
})