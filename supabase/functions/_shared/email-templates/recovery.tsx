/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { SoloBizzShell, BrandButton, styles } from './brand.tsx'
import { getStrings, normalizeLang, type Lang } from './i18n.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string | null
  language?: Lang | string | null
}

export const RecoveryEmail = ({
  confirmationUrl,
  token,
  language,
}: RecoveryEmailProps) => {
  const lang = normalizeLang(language)
  const s = getStrings(lang).recovery
  return (
    <SoloBizzShell
      lang={lang}
      preview={s.preview}
      tagline={s.tagline}
      icon="🔑"
      title={s.heroTitle}
      subtitle={s.heroSub}
    >
      <Text style={styles.paragraph}>{s.intro}</Text>
      {token ? <Text style={styles.codeBox}>{token}</Text> : null}
      <BrandButton href={confirmationUrl}>{s.ctaFallback}</BrandButton>
      <Text style={styles.smallMuted}>{s.helper}</Text>
    </SoloBizzShell>
  )
}

export default RecoveryEmail
