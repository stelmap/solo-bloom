/// <reference types="npm:@types/react@18.3.1" />
// End-to-end contract test: deactivating a user with `en` vs `uk` profile
// language MUST render the warning + final-deletion emails in that language,
// and the template's subject function MUST return the localized subject that
// is written into `email_send_log` when the email is sent.
//
// We render the templates the same way `send-transactional-email` does
// (React Email render()) and assert distinctive language strings appear.
import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/render@0.0.17'
import { assert, assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'

import { template as warning } from '../_shared/transactional-email-templates/account-deactivation-warning.tsx'
import { template as finalDeletion } from '../_shared/transactional-email-templates/account-deleted-final.tsx'

type Case = {
  lang: 'en' | 'uk'
  warningSubject: string
  warningMustInclude: string[]
  warningMustNotInclude: string[]
  finalSubject: string
  finalMustInclude: string[]
  finalMustNotInclude: string[]
  htmlLang: string
}

const CASES: Case[] = [
  {
    lang: 'en',
    htmlLang: 'en',
    warningSubject: 'Your SoloBizz account is scheduled for deletion',
    warningMustInclude: ['scheduled for deletion', 'Login to SoloBizz', 'permanently deleted in 7 days'],
    warningMustNotInclude: ['заплановано', 'Увійти'],
    finalSubject: 'Your SoloBizz account has been deleted',
    finalMustInclude: ['has been permanently deleted', 'create a new account'],
    finalMustNotInclude: ['видалено', 'акаунт'],
  },
  {
    lang: 'uk',
    htmlLang: 'uk',
    warningSubject: 'Ваш акаунт SoloBizz заплановано до видалення',
    warningMustInclude: ['заплановано до видалення', 'Увійти до SoloBizz', 'через 7 днів'],
    warningMustNotInclude: ['scheduled for deletion', 'Login to SoloBizz'],
    finalSubject: 'Ваш акаунт SoloBizz було видалено',
    finalMustInclude: ['було остаточно видалено', 'створити новий акаунт'],
    finalMustNotInclude: ['permanently deleted', 'create a new account'],
  },
]

function callSubject(entry: { subject: string | ((d: Record<string, any>) => string) }, data: Record<string, any>) {
  return typeof entry.subject === 'function' ? entry.subject(data) : entry.subject
}

for (const c of CASES) {
  Deno.test(`deactivation warning email renders in ${c.lang}`, async () => {
    const html = await render(React.createElement(warning.component, { language: c.lang }))
    assertStringIncludes(html, `lang="${c.htmlLang}"`)
    for (const needle of c.warningMustInclude) assertStringIncludes(html, needle)
    for (const forbidden of c.warningMustNotInclude) assert(!html.includes(forbidden), `warning[${c.lang}] must not include "${forbidden}"`)
    assertEquals(callSubject(warning, { language: c.lang }), c.warningSubject)
  })

  Deno.test(`final deletion email renders in ${c.lang}`, async () => {
    const html = await render(React.createElement(finalDeletion.component, { language: c.lang }))
    assertStringIncludes(html, `lang="${c.htmlLang}"`)
    for (const needle of c.finalMustInclude) assertStringIncludes(html, needle)
    for (const forbidden of c.finalMustNotInclude) assert(!html.includes(forbidden), `final[${c.lang}] must not include "${forbidden}"`)
    assertEquals(callSubject(finalDeletion, { language: c.lang }), c.finalSubject)
  })
}

Deno.test('unknown language falls back to English (matches admin-lifecycle-action normalization)', async () => {
  const html = await render(React.createElement(warning.component, { language: 'xx' }))
  assertStringIncludes(html, 'lang="en"')
  assertStringIncludes(html, 'scheduled for deletion')
  assertEquals(callSubject(warning, { language: 'xx' }), 'Your SoloBizz account is scheduled for deletion')
})
