/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Link, Text } from 'npm:@react-email/components@0.0.22'
import { SoloBizzShell, BrandButton, styles } from './brand.tsx'
import { getStrings, normalizeLang, type Lang } from './i18n.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  language?: Lang | string | null
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  language,
}: SignupEmailProps) => {
  const lang = normalizeLang(language)
  const s = getStrings(lang).signup
  return (
    <SoloBizzShell
      lang={lang}
      preview={s.preview}
      tagline={s.tagline}
      icon="✉️"
      title={s.heroTitle}
      subtitle={s.heroSub}
    >
      <Text style={styles.paragraph}>{s.greeting}</Text>
      <Text style={styles.paragraph}>{s.intro(siteName)}</Text>
      <Text style={styles.infoBox}>
        {s.signingInAs}:{' '}
        <Link href={`mailto:${recipient}`} style={{ color: 'inherit' }}>
          <strong>{recipient}</strong>
        </Link>
      </Text>
      <BrandButton href={confirmationUrl}>{s.cta}</BrandButton>
      <Text style={styles.paragraphMuted}>
        {s.features.calendar} — {s.features.calendarDesc}
        <br />
        {s.features.finance} — {s.features.financeDesc}
        <br />
        {s.features.metrics} — {s.features.metricsDesc}
      </Text>
      <Text style={styles.smallMuted}>{s.ignore}</Text>
      <Text style={styles.smallMuted}>
        <Link href={siteUrl} style={styles.footerLink}>
          {siteUrl}
        </Link>
      </Text>
    </SoloBizzShell>
  )
}

export default SignupEmail
