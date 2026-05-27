/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { SoloBizzShell, styles } from './brand.tsx'
import { getStrings, normalizeLang } from './i18n.ts'

interface ReauthenticationEmailProps {
  token: string
  language?: string
}

export const ReauthenticationEmail = ({ token, language }: ReauthenticationEmailProps) => {
  const T = getStrings(language).reauthentication
  const F = getStrings(language).footer
  return (
    <SoloBizzShell
      lang={normalizeLang(language)}
      preview={T.preview}
      icon={<>🔒</>}
      title={T.heroTitle}
      subtitle={T.heroSub}
      tagline={T.tagline}
      footer={<Text style={styles.footerText}>{F.brandLine}</Text>}
    >
      <Text style={styles.paragraph}>{T.intro}</Text>
      <Text style={styles.codeBox}>{token}</Text>
      <Text style={styles.smallMuted}>{T.footer}</Text>
    </SoloBizzShell>
  )
}

export default ReauthenticationEmail
