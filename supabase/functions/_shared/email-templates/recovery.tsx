/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { SoloBizzShell, BrandButton, styles } from './brand.tsx'
import { getStrings, normalizeLang } from './i18n.ts'

interface RecoveryEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl?: string
  token?: string
  language?: string
}

export const RecoveryEmail = ({
  confirmationUrl,
  token,
  language,
}: RecoveryEmailProps) => {
  const T = getStrings(language).recovery
  const F = getStrings(language).footer
  return (
    <SoloBizzShell
      lang={normalizeLang(language)}
      preview={T.preview}
      icon={<>🔑</>}
      title={T.heroTitle}
      subtitle={T.heroSub}
      tagline={T.tagline}
      footer={<Text style={styles.footerText}>{F.brandLine}</Text>}
    >
      <Text style={styles.paragraph}>{T.intro}</Text>
      {token ? <Text style={styles.codeBox}>{token}</Text> : null}
      {confirmationUrl ? <BrandButton href={confirmationUrl}>{T.ctaFallback} →</BrandButton> : null}
      <Text style={styles.smallMuted}>{T.helper}</Text>
    </SoloBizzShell>
  )
}

export default RecoveryEmail
