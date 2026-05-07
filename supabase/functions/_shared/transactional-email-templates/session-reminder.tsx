/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Solo.Biz"

type Lang = 'en' | 'fr' | 'pl' | 'uk'
function normalizeLang(value: unknown): Lang {
  const v = String(value || '').toLowerCase().slice(0, 2)
  if (v === 'fr' || v === 'pl' || v === 'uk') return v
  return 'en'
}

const STRINGS: Record<Lang, {
  preview: string
  subject: string
  heading: string
  greeting: (name: string) => string
  intro: (specialist: string) => React.ReactNode
  dateLabel: string
  timeLabel: string
  confirmBtn: string
  rescheduleHint: string
  signature: string
  htmlLang: string
}> = {
  en: {
    preview: 'Reminder: Your session is tomorrow',
    subject: 'Reminder: Your session is tomorrow',
    heading: 'Session Reminder 📅',
    greeting: (n) => `Hi ${n},`,
    intro: (s) => <>This is a friendly reminder about your upcoming consultation session with <strong>{s}</strong>.</>,
    dateLabel: '📅 Date',
    timeLabel: '🕐 Time',
    confirmBtn: 'Confirm Session',
    rescheduleHint: 'If you need to reschedule, please contact your specialist directly.',
    signature: `— The ${SITE_NAME} Team`,
    htmlLang: 'en',
  },
  fr: {
    preview: 'Rappel : votre séance est demain',
    subject: 'Rappel : votre séance est demain',
    heading: 'Rappel de séance 📅',
    greeting: (n) => `Bonjour ${n},`,
    intro: (s) => <>Ceci est un rappel amical concernant votre prochaine séance avec <strong>{s}</strong>.</>,
    dateLabel: '📅 Date',
    timeLabel: '🕐 Heure',
    confirmBtn: 'Confirmer la séance',
    rescheduleHint: 'Si vous devez reporter, contactez directement votre spécialiste.',
    signature: `— L'équipe ${SITE_NAME}`,
    htmlLang: 'fr',
  },
  pl: {
    preview: 'Przypomnienie: Twoja sesja jest jutro',
    subject: 'Przypomnienie: Twoja sesja jest jutro',
    heading: 'Przypomnienie o sesji 📅',
    greeting: (n) => `Cześć ${n},`,
    intro: (s) => <>To przyjazne przypomnienie o nadchodzącej sesji konsultacyjnej z <strong>{s}</strong>.</>,
    dateLabel: '📅 Data',
    timeLabel: '🕐 Godzina',
    confirmBtn: 'Potwierdź sesję',
    rescheduleHint: 'Jeśli musisz przełożyć, skontaktuj się bezpośrednio ze specjalistą.',
    signature: `— Zespół ${SITE_NAME}`,
    htmlLang: 'pl',
  },
  uk: {
    preview: 'Нагадування: ваш сеанс завтра',
    subject: 'Нагадування: ваш сеанс завтра',
    heading: 'Нагадування про сеанс 📅',
    greeting: (n) => `Вітаємо, ${n},`,
    intro: (s) => <>Це дружнє нагадування про ваш найближчий консультаційний сеанс із <strong>{s}</strong>.</>,
    dateLabel: '📅 Дата',
    timeLabel: '🕐 Час',
    confirmBtn: 'Підтвердити сеанс',
    rescheduleHint: 'Якщо вам потрібно перенести, зв’яжіться зі своїм спеціалістом напряму.',
    signature: `— Команда ${SITE_NAME}`,
    htmlLang: 'uk',
  },
}

interface SessionReminderProps {
  clientName?: string
  specialistName?: string
  sessionDate?: string
  sessionTime?: string
  confirmationUrl?: string
  language?: string
}

const SessionReminderEmail = ({
  clientName = 'Client',
  specialistName = 'your specialist',
  sessionDate = '',
  sessionTime = '',
  confirmationUrl,
  language,
}: SessionReminderProps) => {
  const T = STRINGS[normalizeLang(language)]
  return (
    <Html lang={T.htmlLang} dir="ltr">
      <Head />
      <Preview>{T.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>Solo<span style={logoDot}>.Biz</span></Text>
          </Section>
          <Heading style={h1}>{T.heading}</Heading>
          <Text style={text}>{T.greeting(clientName)}</Text>
          <Text style={text}>{T.intro(specialistName)}</Text>
          <Section style={detailsBox}>
            <Text style={detailLabel}>{T.dateLabel}</Text>
            <Text style={detailValue}>{sessionDate}</Text>
            <Text style={detailLabel}>{T.timeLabel}</Text>
            <Text style={detailValue}>{sessionTime}</Text>
          </Section>
          {confirmationUrl && (
            <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
              <Button style={button} href={confirmationUrl}>{T.confirmBtn}</Button>
            </Section>
          )}
          <Text style={footer}>{T.rescheduleHint}</Text>
          <Text style={footer}>{T.signature}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SessionReminderEmail,
  subject: (data: Record<string, any>) => STRINGS[normalizeLang(data?.language)].subject,
  displayName: 'Session reminder',
  previewData: {
    clientName: 'Jane Doe',
    specialistName: 'Dr. Smith',
    sessionDate: 'April 10, 2026',
    sessionTime: '10:00 AM',
    confirmationUrl: 'https://example.com/confirm-session?token=abc123',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const logoSection = { marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const logoDot = { color: '#FF9900' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px 24px', margin: '0 0 8px' }
const detailLabel = { fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, margin: '0 0 4px', letterSpacing: '0.05em' }
const detailValue = { fontSize: '16px', color: '#0f172a', fontWeight: '600' as const, margin: '0 0 16px' }
const button = { backgroundColor: '#FF9900', color: '#0f172a', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
