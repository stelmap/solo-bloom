/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Solo.Bizz'

function titleCaseName(name?: string) {
  if (!name) return name
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  const hasLower = /\p{Ll}/u.test(trimmed)
  if (hasLower) return trimmed
  return trimmed
    .toLocaleLowerCase()
    .split(/(\s+|[-'’])/)
    .map((part) =>
      /^\s+$/.test(part) || part === '-' || part === "'" || part === '’'
        ? part
        : part.charAt(0).toLocaleUpperCase() + part.slice(1),
    )
    .join('')
}

type Lang = 'en' | 'fr' | 'pl' | 'uk'
function normalizeLang(value: unknown): Lang {
  const v = String(value || '').toLowerCase().slice(0, 2)
  if (v === 'fr' || v === 'pl' || v === 'uk') return v
  return 'en'
}

const STRINGS: Record<Lang, {
  preview: string
  subject: string
  label: string
  badge: string
  greeting: (n: string) => string
  body: string
  dateLabel: string
  timeLabel: string
  reasonLabel: string
  defaultReason: string
  reschedule: string
  footer: string
  htmlLang: string
}> = {
  en: {
    preview: 'Your session has been cancelled',
    subject: 'Your session has been cancelled',
    label: 'SESSION CANCELLED',
    badge: 'Cancelled appointment',
    greeting: (n) => `Hi ${n},`,
    body: "We're sorry to inform you that your upcoming session has been cancelled.",
    dateLabel: 'DATE',
    timeLabel: 'TIME',
    reasonLabel: 'REASON',
    defaultReason: 'The specialist marked this time as unavailable.',
    reschedule: 'Please contact your specialist to reschedule at a convenient time.',
    footer: `You received this notice because you have a booking with a ${SITE_NAME} practitioner.`,
    htmlLang: 'en',
  },
  fr: {
    preview: 'Votre séance a été annulée',
    subject: 'Votre séance a été annulée',
    label: 'SÉANCE ANNULÉE',
    badge: 'Rendez-vous annulé',
    greeting: (n) => `Bonjour ${n},`,
    body: 'Nous avons le regret de vous informer que votre prochaine séance a été annulée.',
    dateLabel: 'DATE',
    timeLabel: 'HEURE',
    reasonLabel: 'MOTIF',
    defaultReason: 'Le spécialiste a marqué ce créneau comme indisponible.',
    reschedule: 'Contactez votre spécialiste pour reprogrammer à un moment qui vous convient.',
    footer: `Vous recevez cet avis car vous avez une réservation avec un praticien ${SITE_NAME}.`,
    htmlLang: 'fr',
  },
  pl: {
    preview: 'Twoja sesja została odwołana',
    subject: 'Twoja sesja została odwołana',
    label: 'SESJA ODWOŁANA',
    badge: 'Wizyta odwołana',
    greeting: (n) => `Cześć ${n},`,
    body: 'Z przykrością informujemy, że Twoja nadchodząca sesja została odwołana.',
    dateLabel: 'DATA',
    timeLabel: 'GODZINA',
    reasonLabel: 'POWÓD',
    defaultReason: 'Specjalista oznaczył ten termin jako niedostępny.',
    reschedule: 'Skontaktuj się ze specjalistą, aby ustalić nowy termin.',
    footer: `Otrzymujesz to powiadomienie, ponieważ masz rezerwację u specjalisty ${SITE_NAME}.`,
    htmlLang: 'pl',
  },
  uk: {
    preview: 'Ваш сеанс було скасовано',
    subject: 'Ваш сеанс було скасовано',
    label: 'СЕАНС СКАСОВАНО',
    badge: 'Зустріч скасовано',
    greeting: (n) => `Вітаємо, ${n},`,
    body: 'На жаль, повідомляємо, що ваш найближчий сеанс було скасовано.',
    dateLabel: 'ДАТА',
    timeLabel: 'ЧАС',
    reasonLabel: 'ПРИЧИНА',
    defaultReason: 'Спеціаліст позначив цей час як недоступний.',
    reschedule: 'Зв’яжіться зі спеціалістом, щоб перенести сеанс на зручний час.',
    footer: `Ви отримали це повідомлення, бо маєте бронювання у спеціаліста ${SITE_NAME}.`,
    htmlLang: 'uk',
  },
}

interface SessionCancellationProps {
  clientName?: string
  specialistName?: string
  businessName?: string
  specialistTitle?: string
  sessionDate?: string
  sessionTime?: string
  cancellationReason?: string
  language?: string
}

function initials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

const SessionCancellationEmail = ({
  clientName = 'Client',
  specialistName,
  businessName,
  specialistTitle,
  sessionDate = '',
  sessionTime = '',
  cancellationReason,
  language,
}: SessionCancellationProps) => {
  const T = STRINGS[normalizeLang(language)]
  const reason = cancellationReason || T.defaultReason
  const displaySpecialistName = titleCaseName(specialistName) || specialistName
  const subtitle = [specialistTitle, businessName].filter(Boolean).join(' · ')

  return (
    <Html lang={T.htmlLang} dir="ltr">
      <Head />
      <Preview>{T.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>Solo<span style={logoDot}>.Bizz</span></Text>
            <Text style={headerLabel}>{T.label}</Text>
            {displaySpecialistName && (
              <table cellPadding={0} cellSpacing={0} role="presentation" style={{ marginTop: 18 }}>
                <tr>
                  <td style={{ verticalAlign: 'middle', paddingRight: 14 }}>
                    <div style={avatarFallback}>{initials(displaySpecialistName)}</div>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={specName}>{displaySpecialistName}</Text>
                    {subtitle && <Text style={specSub}>{subtitle}</Text>}
                  </td>
                </tr>
              </table>
            )}
          </Section>

          {/* Body */}
          <Section style={bodySection}>
            <div style={badgeCancelled}>{T.badge}</div>
            <Heading style={h1}>{T.greeting(clientName)}</Heading>
            <Text style={lead}>{T.body}</Text>

            <Section style={detailsCard}>
              <Row label={T.dateLabel} value={sessionDate} icon="📅" />
              <div style={divider} />
              <Row label={T.timeLabel} value={sessionTime} icon="🕐" />
            </Section>

            <Section style={reasonBox}>
              <Text style={reasonLabel}>{T.reasonLabel}</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>

            <Text style={outroText}>{T.reschedule}</Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerBrand}>Solo<span style={logoDot}>.Bizz</span></Text>
            <Text style={footerText}>{T.footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: '100%' }}>
      <tr>
        <td style={{ width: 48, verticalAlign: 'top', paddingTop: 4 }}>
          <div style={iconBox}>{icon}</div>
        </td>
        <td style={{ verticalAlign: 'top' }}>
          <Text style={rowLabelStyle}>{label}</Text>
          <Text style={rowValue}>{value}</Text>
        </td>
      </tr>
    </table>
  )
}

export const template = {
  component: SessionCancellationEmail,
  subject: (data: Record<string, any>) => STRINGS[normalizeLang(data?.language)].subject,
  displayName: 'Session cancellation',
  previewData: {
    clientName: 'Jane',
    specialistName: 'Dr. Anna Kovalenko',
    businessName: 'Cognitive Behavioural Therapy',
    specialistTitle: 'Psychotherapist',
    sessionDate: 'April 10, 2026',
    sessionTime: '10:00 – 11:00',
    cancellationReason: 'The specialist marked this time as unavailable.',
    language: 'en',
  },
} satisfies TemplateEntry

// ----- styles (shared with session-reminder / booking-confirmation) -----
const FONT_STACK = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const SERIF_STACK = "'Instrument Serif', 'DM Serif Display', 'Times New Roman', Georgia, serif"

const main = { backgroundColor: '#ffffff', fontFamily: FONT_STACK, margin: 0, padding: '24px 12px' }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f0eee9', fontFamily: FONT_STACK }

const header = { backgroundColor: '#11122b', padding: '28px 28px 26px', color: '#ffffff', fontFamily: FONT_STACK }
const logo = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: 0, fontFamily: FONT_STACK }
const logoDot = { color: '#FF9900' }
const headerLabel = { fontSize: '11px', color: '#8a8ca6', fontWeight: 'bold' as const, letterSpacing: '0.18em', margin: '22px 0 0', fontFamily: FONT_STACK }
const avatarFallback = { width: 48, height: 48, borderRadius: 999, backgroundColor: '#FF9900', color: '#11122b', fontWeight: 'bold' as const, fontSize: 16, lineHeight: '48px', textAlign: 'center' as const, fontFamily: FONT_STACK }
const specName = { fontSize: '17px', fontWeight: 'bold' as const, color: '#ffffff', margin: 0, lineHeight: 1.2, fontFamily: FONT_STACK }
const specSub = { fontSize: '13px', color: '#b4b6cf', margin: '4px 0 0', fontFamily: FONT_STACK }

const bodySection = { padding: '28px 28px 8px', fontFamily: FONT_STACK }
const badgeCancelled = { display: 'inline-block', fontSize: '12px', fontWeight: 'bold' as const, padding: '6px 12px', borderRadius: '999px', margin: '0 0 16px', fontFamily: FONT_STACK, backgroundColor: '#fef2f2', color: '#dc2626' }

const h1 = { fontSize: '30px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.15, fontFamily: SERIF_STACK }
const lead = { fontSize: '15px', color: '#5b6076', lineHeight: 1.6, margin: '0 0 24px', fontFamily: FONT_STACK }

const detailsCard = { backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f0eee9', borderLeft: '3px solid #FF9900', padding: '20px 22px', margin: '0 0 20px', fontFamily: FONT_STACK }
const iconBox = { width: 36, height: 36, borderRadius: 10, backgroundColor: '#11122b', color: '#FF9900', lineHeight: '36px', textAlign: 'center' as const, fontSize: 16, fontFamily: FONT_STACK }
const rowLabelStyle = { fontSize: '11px', color: '#8a8ca6', fontWeight: 'bold' as const, letterSpacing: '0.12em', margin: '0 0 4px' }
const rowValue = { fontSize: '16px', color: '#0f172a', fontWeight: 'bold' as const, margin: 0 }
const divider = { height: 1, backgroundColor: '#e8e5dc', margin: '14px 0' }

const reasonBox = { backgroundColor: '#fef2f2', borderRadius: '14px', padding: '14px 18px', margin: '0 0 20px', borderLeft: '3px solid #dc2626' }
const reasonLabel = { fontSize: '11px', color: '#dc2626', fontWeight: 'bold' as const, letterSpacing: '0.12em', margin: '0 0 4px' }
const reasonText = { fontSize: '14px', color: '#991b1b', margin: 0, lineHeight: 1.5 }

const outroText = { fontSize: '14px', color: '#5b6076', lineHeight: 1.6, margin: '8px 0 0', fontFamily: FONT_STACK }

const footerSection = { padding: '24px 28px 28px', borderTop: '1px solid #f0eee9', textAlign: 'center' as const, fontFamily: FONT_STACK }
const footerBrand = { fontSize: '14px', color: '#0f172a', fontWeight: 'bold' as const, margin: '0 0 8px', fontFamily: FONT_STACK }
const footerText = { fontSize: '12px', color: '#8a8ca6', margin: 0, lineHeight: 1.6, fontFamily: FONT_STACK }
