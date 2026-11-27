/// <reference types="npm:@types/react@18.3.1" />

/**
 * Shared compact light shell for account emails. Uses the welcome palette,
 * email-safe tables and inline styles, without font-dependent symbol icons.
 * Verification content and delivery remain the responsibility of each sender.
 */

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { WELCOME_THEME, WEBSITE_URL, SUPPORT_EMAIL } from './welcome-content.ts'

export const BRAND = {
  navy: '#0D1526',
  navySoft: '#141824',
  orange: WELCOME_THEME.orange,
  orange2: '#FF8C3A',
  white: WELCOME_THEME.white,
  ink: WELCOME_THEME.ink,
  text: WELCOME_THEME.text,
  textSoft: WELCOME_THEME.text,
  muted: WELCOME_THEME.muted,
  rule: WELCOME_THEME.rule,
  surface: WELCOME_THEME.lavender,
  footerBg: WELCOME_THEME.white,
  border: WELCOME_THEME.rule,
  green: '#16A34A',
  greenBg: '#F0FDF4',
  red: '#DC2626',
  redBg: '#FEF2F2',
  amber: '#D97706',
  amberBg: '#FFF8F0',
}

const fontStack =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

export const styles = {
  main: { backgroundColor: '#ffffff', margin: 0, padding: 0, fontFamily: fontStack },
  wrapper: {
    backgroundColor: BRAND.footerBg,
    padding: '16px 8px',
    fontFamily: fontStack,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: '16px',
    overflow: 'hidden',
    margin: '0 auto',
    maxWidth: '640px',
    width: '100%',
    border: `1px solid ${BRAND.rule}`,
  },
  header: {
    backgroundColor: BRAND.surface,
    padding: '20px 24px 12px',
  },
  wordmark: { fontSize: '22px', lineHeight: 1, margin: 0 },
  wordmarkSolo: { color: BRAND.ink, fontWeight: 700 },
  wordmarkBizz: { color: BRAND.orange, fontWeight: 800 },
  tagline: {
    color: BRAND.textSoft,
    fontSize: '10px',
    letterSpacing: 0,
    textTransform: 'uppercase' as const,
    margin: '10px 0 0',
    fontWeight: 600,
  },
  hero: {
    backgroundColor: BRAND.surface,
    padding: '0 24px 20px',
    textAlign: 'left' as const,
  },
  heroIcon: {
    display: 'inline-block',
    width: '60px',
    height: '60px',
    lineHeight: '60px',
    borderRadius: '16px',
    background: `linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.orange2} 100%)`,
    color: BRAND.ink,
    fontSize: '24px',
    margin: '0 auto 18px',
    textAlign: 'center' as const,
  },
  heroTitle: {
    color: BRAND.ink,
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: 0,
    lineHeight: 1.2,
    margin: '0 0 8px',
  },
  heroSub: {
    color: BRAND.text,
    fontSize: '14px',
    lineHeight: 1.55,
    margin: 0,
  },
  divider: {
    height: '8px',
    backgroundColor: BRAND.navy,
    borderBottom: `8px solid ${BRAND.white}`,
    lineHeight: 0,
    fontSize: 0,
  },
  body: { padding: '20px 24px', backgroundColor: BRAND.white },
  paragraph: {
    fontSize: '14px',
    color: BRAND.text,
    lineHeight: 1.7,
    margin: '0 0 14px',
  },
  paragraphMuted: {
    fontSize: '13px',
    color: BRAND.textSoft,
    lineHeight: 1.6,
    margin: '0 0 14px',
  },
  smallMuted: {
    fontSize: '12px',
    color: BRAND.muted,
    lineHeight: 1.5,
    margin: '14px 0 0',
  },
  ctaWrap: { textAlign: 'center' as const, margin: '16px 0', backgroundColor: WELCOME_THEME.peach, padding: '14px 8px', borderRadius: '12px' },
  button: {
    display: 'inline-block',
    backgroundColor: BRAND.orange,
    color: BRAND.white,
    fontSize: '14px',
    fontWeight: 700,
    padding: '14px 22px',
    borderRadius: '11px',
    textDecoration: 'none',
    letterSpacing: 0,
  },
  buttonOutline: {
    display: 'inline-block',
    background: BRAND.white,
    color: BRAND.orange,
    fontSize: '14px',
    fontWeight: 700,
    padding: '12px 28px',
    borderRadius: '11px',
    border: `2px solid ${BRAND.orange}`,
    textDecoration: 'none',
    letterSpacing: 0,
  },
  infoBox: {
    backgroundColor: BRAND.surface,
    borderRadius: '10px',
    padding: '14px 16px',
    margin: '16px 0',
    fontSize: '13px',
    color: BRAND.text,
    lineHeight: 1.55,
  },
  warnBox: {
    backgroundColor: BRAND.amberBg,
    borderLeft: `3px solid ${BRAND.orange}`,
    borderRadius: '8px',
    padding: '12px 16px',
    margin: '16px 0',
    fontSize: '13px',
    color: '#6B4226',
    lineHeight: 1.55,
  },
  dangerBox: {
    backgroundColor: BRAND.redBg,
    borderLeft: `3px solid ${BRAND.red}`,
    borderRadius: '8px',
    padding: '12px 16px',
    margin: '16px 0',
    fontSize: '13px',
    color: '#7B1D1D',
    lineHeight: 1.55,
  },
  successBox: {
    backgroundColor: BRAND.greenBg,
    borderLeft: `3px solid ${BRAND.green}`,
    borderRadius: '8px',
    padding: '12px 16px',
    margin: '16px 0',
    fontSize: '13px',
    color: '#1F4E2E',
    lineHeight: 1.55,
  },
  codeBox: {
    backgroundColor: WELCOME_THEME.peach,
    color: BRAND.ink,
    fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace",
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: 0,
    textAlign: 'center' as const,
    padding: '18px 12px',
    borderRadius: '12px',
    margin: '16px 0',
    overflowWrap: 'anywhere' as const,
  },
  detailRow: {
    backgroundColor: BRAND.surface,
    borderRadius: '11px',
    padding: '14px 18px',
    margin: '6px 0',
  },
  detailLabel: {
    fontSize: '11px',
    color: BRAND.muted,
    fontWeight: 600,
    letterSpacing: 0,
    textTransform: 'uppercase' as const,
    margin: 0,
  },
  detailValue: {
    fontSize: '15px',
    color: BRAND.ink,
    fontWeight: 600,
    margin: '2px 0 0',
  },
  hairline: {
    height: '1px',
    backgroundColor: BRAND.rule,
    margin: '20px 0',
    border: 'none',
  },
  footer: {
    backgroundColor: BRAND.footerBg,
    borderTop: `1px solid ${BRAND.border}`,
    padding: '16px 24px 20px',
    textAlign: 'left' as const,
  },
  footerText: {
    fontSize: '12px',
    color: BRAND.muted,
    lineHeight: 1.6,
    margin: 0,
  },
  footerLink: {
    color: BRAND.muted,
    textDecoration: 'underline',
  },
}

interface ShellProps {
  lang?: string
  dir?: 'ltr' | 'rtl'
  preview: string
  icon: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  tagline?: string
  /** Optional HTTPS PNG shown centered above a centered hero title. */
  heroImage?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/**
 * SoloBizzShell — the outer account email frame.
 * Pass the localized preview, title/subtitle, and the body
 * paragraphs as children. Pass a localized footer node if needed.
 */
export const SoloBizzShell: React.FC<ShellProps> = ({
  lang = 'en',
  dir = 'ltr',
  preview,
  title,
  subtitle,
  tagline = 'Business · Manager',
  heroImage,
  children,
  footer,
}) => (
  <Html lang={lang} dir={dir}>
    <Head><meta charSet="utf-8" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" /></Head>
    <Preview>{preview}</Preview>
    <Body style={styles.main}>
      <Section style={styles.wrapper}>
        <Container style={styles.card}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.wordmark}>
              <span style={styles.wordmarkSolo}>Solo</span>
              <span style={styles.wordmarkBizz}>&nbsp;.Bizz</span>
            </Heading>
            {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
          </Section>
          {/* Hero */}
          <Section style={heroImage ? { ...styles.hero, backgroundColor: BRAND.white, paddingTop: '24px', textAlign: 'center' as const } : styles.hero}>
            {heroImage ? <Img src={heroImage} alt="" width="48" height="48" style={{ width: '48px', height: '48px', margin: '0 auto 12px' }} /> : null}
            <Heading style={heroImage ? { ...styles.heroTitle, fontSize: '20px', textAlign: 'center' as const } : styles.heroTitle}>{title}</Heading>
            {subtitle ? <Text style={heroImage ? { ...styles.heroSub, textAlign: 'center' as const, color: BRAND.muted } : styles.heroSub}>{subtitle}</Text> : null}
          </Section>
          {/* Body */}
          <Section style={styles.body}>{children}</Section>
          {/* Footer */}
          <Section style={styles.footer}>
            {footer ?? (
              <>
                <Heading style={styles.wordmark}><span style={styles.wordmarkSolo}>Solo</span><span style={styles.wordmarkBizz}> .Bizz</span></Heading>
                <Text style={{ ...styles.footerText, marginTop: '10px' }}>
                  <Link href={`mailto:${SUPPORT_EMAIL}`} style={{ ...styles.footerLink, color: BRAND.orange }}>{SUPPORT_EMAIL}</Link><br />
                  <Link href={WEBSITE_URL} style={styles.footerLink}>solo-bizz.com</Link><br />
                  © {new Date().getUTCFullYear()} Solo .Bizz
                </Text>
              </>
            )}
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export const BrandButton: React.FC<{ href: string; children: React.ReactNode; variant?: 'solid' | 'outline' }> = ({
  href,
  children,
  variant = 'solid',
}) => (
  <Section style={styles.ctaWrap}>
    <Button href={href} style={variant === 'outline' ? styles.buttonOutline : styles.button}>
      {children}
    </Button>
  </Section>
)
