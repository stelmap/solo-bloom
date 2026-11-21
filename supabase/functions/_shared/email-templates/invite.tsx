/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { SoloBizzShell, BrandButton, styles } from './brand.tsx'
import { getStrings, normalizeLang, type Lang } from './i18n.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  language?: Lang | string | null
}

export const InviteEmail = ({
  siteName,
  confirmationUrl,
  language,
}: InviteEmailProps) => {
  const lang = normalizeLang(language)
  const s = getStrings(lang).invite
  return (
    <SoloBizzShell
      lang={lang}
      preview={s.preview}
      tagline={s.tagline}
      icon="🎉"
      title={s.heroTitle}
      subtitle={s.heroSub}
    >
      <Text style={styles.paragraph}>{s.body(siteName)}</Text>
      <BrandButton href={confirmationUrl}>{s.cta}</BrandButton>
      <Text style={styles.smallMuted}>{s.ignore}</Text>
    </SoloBizzShell>
  )
}

export default InviteEmail
