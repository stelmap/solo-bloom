import * as React from 'npm:react@18.3.1'
import { SignupEmail } from '../supabase/functions/_shared/email-templates/signup.tsx'
import { renderEmailPreview } from '../supabase/functions/_shared/email-templates/render-preview.ts'

Deno.test('all six welcome previews preserve Unicode across HTML render boundaries', () => {
  for (const language of ['uk', 'en', 'pl', 'de', 'fr', 'ru']) {
    const html = renderEmailPreview(React.createElement(SignupEmail, {
      siteName: 'Solo .Bizz', siteUrl: 'https://solo-bizz.com', recipient: 'preview@example.test',
      confirmationUrl: 'https://solo-bizz.com/auth?preview=confirmation', language,
    }))
    if (html.includes('\ufffd')) throw new Error(`Corrupt Unicode in ${language}`)
    if (language === 'uk' && !html.includes('аналітика практики')) throw new Error('Ukrainian practice text corrupted')
  }
})