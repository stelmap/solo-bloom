/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { SoloBizzShell, styles } from './brand.tsx'
import { getStrings, normalizeLang, type Lang } from './i18n.ts'

interface ReauthenticationEmailProps {
  token: string
  language?: Lang | string | null
}

export const ReauthenticationEmail = ({
  token,
  language,
}: ReauthenticationEmailProps) => {
  const lang = normalizeLang(language)
  const s = getStrings(lang).reauthentication
  return (
    <SoloBizzShell
      lang={lang}
      preview={s.preview}
      tagline={s.tagline}
      icon="🛡️"
      title={s.heroTitle}
      subtitle={s.heroSub}
    >
      <Text style={styles.paragraph}>{s.intro}</Text>
      <Text style={styles.codeBox}>{token}</Text>
      <Text style={styles.smallMuted}>{s.footer}</Text>
    </SoloBizzShell>
  )
}

export default ReauthenticationEmail
