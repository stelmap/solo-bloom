/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import { SoloBizzShell, BrandButton, styles, BRAND } from './brand.tsx'
import { getStrings, normalizeLang } from './i18n.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  language?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  language,
}: SignupEmailProps) => {
  const T = getStrings(language).signup
  const F = getStrings(language).footer
  const lang = normalizeLang(language)
  return (
    <SoloBizzShell
      lang={lang}
      preview={T.preview}
      icon={<>✉️</>}
      title={T.heroTitle}
      subtitle={T.heroSub}
      tagline={T.tagline}
      footer={
        <>
          <Text style={styles.footerText}>
            {F.ignoreNote}
            <br />
            <Link href={`mailto:${F.contact}`} style={styles.footerLink}>{F.contact}</Link> · {F.brandLine}
          </Text>
        </>
      }
    >
      <Text style={styles.paragraph}>{T.greeting}</Text>
      <Text style={styles.paragraph}>
        {T.intro(siteName)}
      </Text>
      <Text style={styles.paragraphMuted}>
        {T.signingInAs}: <Link href={`mailto:${recipient}`} style={{ color: BRAND.orange, textDecoration: 'none' }}>{recipient}</Link>
      </Text>

      <BrandButton href={confirmationUrl}>{T.cta} →</BrandButton>

      <Section style={{ ...styles.detailRow, display: 'block' }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td align="center" style={{ padding: '4px 8px', width: '33%' }}>
              <Text style={{ ...styles.detailLabel, color: BRAND.ink, fontSize: '12px', textTransform: 'none' as const, fontWeight: 700 }}>📅 {T.features.calendar}</Text>
              <Text style={{ fontSize: '11px', color: BRAND.muted, margin: 0, lineHeight: 1.4 }}>{T.features.calendarDesc}</Text>
            </td>
            <td align="center" style={{ padding: '4px 8px', width: '33%', borderLeft: `1px solid ${BRAND.rule}`, borderRight: `1px solid ${BRAND.rule}` }}>
              <Text style={{ ...styles.detailLabel, color: BRAND.ink, fontSize: '12px', textTransform: 'none' as const, fontWeight: 700 }}>💰 {T.features.finance}</Text>
              <Text style={{ fontSize: '11px', color: BRAND.muted, margin: 0, lineHeight: 1.4 }}>{T.features.financeDesc}</Text>
            </td>
            <td align="center" style={{ padding: '4px 8px', width: '33%' }}>
              <Text style={{ ...styles.detailLabel, color: BRAND.ink, fontSize: '12px', textTransform: 'none' as const, fontWeight: 700 }}>📊 {T.features.metrics}</Text>
              <Text style={{ fontSize: '11px', color: BRAND.muted, margin: 0, lineHeight: 1.4 }}>{T.features.metricsDesc}</Text>
            </td>
          </tr>
        </table>
      </Section>

      <Text style={styles.smallMuted}>{T.ignore}</Text>
    </SoloBizzShell>
  )
}

export default SignupEmail
