/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { SoloBizzShell, BrandButton, styles } from './brand.tsx'
import { getStrings, normalizeLang } from './i18n.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
  language?: string
}

export const InviteEmail = ({
  siteName,
  confirmationUrl,
  language,
}: InviteEmailProps) => {
  const T = getStrings(language).invite
  const F = getStrings(language).footer
  return (
    <SoloBizzShell
      lang={normalizeLang(language)}
      preview={T.preview}
      icon={<>✨</>}
      title={T.heroTitle}
      subtitle={T.heroSub}
      tagline={T.tagline}
      footer={<Text style={styles.footerText}>{F.brandLine}</Text>}
    >
      <Text style={styles.paragraph}>{T.body(siteName)}</Text>
      <BrandButton href={confirmationUrl}>{T.cta} →</BrandButton>
      <Text style={styles.smallMuted}>{T.ignore}</Text>
    </SoloBizzShell>
  )
}

export default InviteEmail
