/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { SoloBizzShell, BrandButton, styles } from './brand.tsx'
import { getStrings, normalizeLang, type Lang } from './i18n.ts'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
  language?: Lang | string | null
}

export const EmailChangeEmail = ({
  oldEmail,
  email,
  newEmail,
  confirmationUrl,
  language,
}: EmailChangeEmailProps) => {
  const lang = normalizeLang(language)
  const s = getStrings(lang).emailChange
  return (
    <SoloBizzShell
      lang={lang}
      preview={s.preview}
      tagline={s.tagline}
      icon="📮"
      title={s.heroTitle}
      subtitle={s.heroSub}
    >
      <Text style={styles.paragraph}>{s.body(oldEmail || email, newEmail)}</Text>
      <Text style={styles.paragraph}>{s.confirmIntro}</Text>
      <BrandButton href={confirmationUrl}>{s.cta}</BrandButton>
      <Text style={styles.dangerBox}>{s.warning}</Text>
    </SoloBizzShell>
  )
}

export default EmailChangeEmail
