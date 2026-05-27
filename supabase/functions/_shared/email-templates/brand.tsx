/// <reference types="npm:@types/react@18.3.1" />

/**
 * Shared SoloBizz brand shell for ALL outgoing emails (auth + transactional).
 *
 * Visual language (matches solobizz_email_templates.html):
 *   - Dark navy header band with "Solo" + orange "Bizz" wordmark.
 *   - Orange gradient hero icon + bold white headline + muted subtitle.
 *   - White body with DM Sans / system body type.
 *   - Pill-shaped orange CTA gradient button.
 *   - Light gray footer band with brand line.
 *
 * Email-client safe: all styles inline, no external CSS, no SVG-only layout
 * (the wave is a thin colored bar fallback inside table layout). The Body
 * background stays #ffffff — required by Lovable transactional rules.
 */

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

export const BRAND = {
  navy: '#0D1526',
  navySoft: '#141824',
  orange: '#FF6B00',
  orange2: '#FF8C3A',
  white: '#ffffff',
  ink: '#111827',
  text: '#374151',
  textSoft: '#6B7280',
  muted: '#9CA3AF',
  rule: '#F0F2F5',
  surface: '#F5F6F8',
  footerBg: '#ECEEF2',
  border: '#E8EAEE',
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
    padding: '24px 12px',
    fontFamily: fontStack,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: '16px',
    overflow: 'hidden',
    margin: '0 auto',
    maxWidth: '600px',
    border: `1px solid ${BRAND.rule}`,
  },
  header: {
    backgroundColor: BRAND.navy,
    padding: '28px 36px 22px',
  },
  wordmark: { fontSize: '22px', lineHeight: 1, margin: 0 },
  wordmarkSolo: { color: BRAND.white, fontWeight: 700 },
  wordmarkBizz: { color: BRAND.orange, fontWeight: 800 },
  tagline: {
    color: '#8090b0',
    fontSize: '10px',
    letterSpacing: '1.4px',
    textTransform: 'uppercase' as const,
    margin: '10px 0 0',
    fontWeight: 600,
  },
  hero: {
    backgroundColor: BRAND.navy,
    padding: '8px 36px 32px',
    textAlign: 'center' as const,
  },
  heroIcon: {
    display: 'inline-block',
    width: '60px',
    height: '60px',
    lineHeight: '60px',
    borderRadius: '16px',
    background: `linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.orange2} 100%)`,
    color: BRAND.white,
    fontSize: '26px',
    margin: '0 auto 18px',
    textAlign: 'center' as const,
  },
  heroTitle: {
    color: BRAND.white,
    fontSize: '26px',
    fontWeight: 800,
    letterSpacing: '-0.3px',
    lineHeight: 1.2,
    margin: '0 0 8px',
  },
  heroSub: {
    color: '#8090b0',
    fontSize: '14px',
    lineHeight: 1.55,
    margin: '0 auto',
    maxWidth: '360px',
  },
  divider: {
    height: '8px',
    backgroundColor: BRAND.navy,
    borderBottom: `8px solid ${BRAND.white}`,
    lineHeight: 0,
    fontSize: 0,
  },
  body: { padding: '32px 36px 28px', backgroundColor: BRAND.white },
  paragraph: {
    fontSize: '15px',
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
    margin: '18px 0 0',
  },
  ctaWrap: { textAlign: 'center' as const, margin: '24px 0 18px' },
  button: {
    display: 'inline-block',
    background: `linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.orange2} 100%)`,
    color: BRAND.white,
    fontSize: '14px',
    fontWeight: 700,
    padding: '14px 36px',
    borderRadius: '11px',
    textDecoration: 'none',
    letterSpacing: '0.3px',
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
    letterSpacing: '0.3px',
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
    backgroundColor: BRAND.navy,
    color: BRAND.white,
    fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace",
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '8px',
    textAlign: 'center' as const,
    padding: '22px 16px',
    borderRadius: '12px',
    margin: '20px 0',
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
    letterSpacing: '0.6px',
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
    padding: '18px 36px 22px',
    textAlign: 'center' as const,
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
  children: React.ReactNode
  footer?: React.ReactNode
}

/**
 * SoloBizzShell — the outer email frame all SoloBizz emails share.
 * Pass the localized preview, hero icon/title/subtitle, and the body
 * paragraphs as children. Pass a localized footer node if needed.
 */
export const SoloBizzShell: React.FC<ShellProps> = ({
  lang = 'en',
  dir = 'ltr',
  preview,
  icon,
  title,
  subtitle,
  tagline = 'Business · Manager',
  children,
  footer,
}) => (
  <Html lang={lang} dir={dir}>
    <Head />
    <Preview>{preview}</Preview>
    <Body style={styles.main}>
      <Section style={styles.wrapper}>
        <Container style={styles.card}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.wordmark}>
              <span style={styles.wordmarkSolo}>Solo</span>
              <span style={styles.wordmarkBizz}>Bizz</span>
            </Heading>
            <Text style={styles.tagline}>{tagline}</Text>
          </Section>
          {/* Hero */}
          <Section style={styles.hero}>
            <Text style={styles.heroIcon}>{icon}</Text>
            <Heading style={styles.heroTitle}>{title}</Heading>
            {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
          </Section>
          <Section style={styles.divider}>&nbsp;</Section>
          {/* Body */}
          <Section style={styles.body}>{children}</Section>
          {/* Footer */}
          <Section style={styles.footer}>
            {footer ?? (
              <Text style={styles.footerText}>
                © {new Date().getUTCFullYear()} SoloBizz · solo-bizz.com
              </Text>
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
