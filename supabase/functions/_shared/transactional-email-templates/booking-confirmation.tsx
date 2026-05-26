/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Solo.Biz'

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
  greeting: (n: string) => string
  intro: (s: string) => React.ReactNode
  dateLabel: string
  timeLabel: string
  serviceLabel: string
  outro: string
  signature: (s: string) => string
  htmlLang: string
}> = {
  en: {
    preview: 'Your session has been confirmed',
    subject: 'Your session has been confirmed',
    heading: 'Session confirmed ✅',
    greeting: (n) => `Hello ${n},`,
    intro: (s) => <>Your session with <strong>{s}</strong> has been confirmed.</>,
    dateLabel: '📅 Date',
    timeLabel: '🕐 Time',
    serviceLabel: '💼 Service',
    outro: 'We are looking forward to seeing you.',
    signature: (s) => `Best regards,\n${s}`,
    htmlLang: 'en',
  },
  fr: {
    preview: 'Votre séance a été confirmée',
    subject: 'Votre séance a été confirmée',
    heading: 'Séance confirmée ✅',
    greeting: (n) => `Bonjour ${n},`,
    intro: (s) => <>Votre séance avec <strong>{s}</strong> a été confirmée.</>,
    dateLabel: '📅 Date',
    timeLabel: '🕐 Heure',
    serviceLabel: '💼 Service',
    outro: 'Nous avons hâte de vous voir.',
    signature: (s) => `Cordialement,\n${s}`,
    htmlLang: 'fr',
  },
  pl: {
    preview: 'Twoja sesja została potwierdzona',
    subject: 'Twoja sesja została potwierdzona',
    heading: 'Sesja potwierdzona ✅',
    greeting: (n) => `Cześć ${n},`,
    intro: (s) => <>Twoja sesja z <strong>{s}</strong> została potwierdzona.</>,
    dateLabel: '📅 Data',
    timeLabel: '🕐 Godzina',
    serviceLabel: '💼 Usługa',
    outro: 'Do zobaczenia wkrótce.',
    signature: (s) => `Pozdrawiam,\n${s}`,
    htmlLang: 'pl',
  },
  uk: {
    preview: 'Ваш сеанс підтверджено',
    subject: 'Ваш сеанс підтверджено',
    heading: 'Сеанс підтверджено ✅',
    greeting: (n) => `Вітаємо, ${n},`,
    intro: (s) => <>Ваш сеанс із <strong>{s}</strong> підтверджено.</>,
    dateLabel: '📅 Дата',
    timeLabel: '🕐 Час',
    serviceLabel: '💼 Послуга',
    outro: 'З нетерпінням чекаємо на зустріч.',
    signature: (s) => `З найкращими побажаннями,\n${s}`,
    htmlLang: 'uk',
  },
}

interface BookingConfirmationProps {
  clientName?: string
  specialistName?: string
  sessionDate?: string
  sessionTime?: string
  serviceName?: string
  language?: string
}

const BookingConfirmationEmail = ({
  clientName = 'Client',
  specialistName = 'your specialist',
  sessionDate = '',
  sessionTime = '',
  serviceName,
  language,
}: BookingConfirmationProps) => {
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
            {serviceName && (
              <>
                <Text style={detailLabel}>{T.serviceLabel}</Text>
                <Text style={detailValue}>{serviceName}</Text>
              </>
            )}
          </Section>
          <Text style={text}>{T.outro}</Text>
          <Text style={footer}>{T.signature(specialistName)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) => STRINGS[normalizeLang(data?.language)].subject,
  displayName: 'Booking confirmation',
  previewData: {
    clientName: 'Jane Doe',
    specialistName: 'Dr. Smith',
    sessionDate: 'May 30, 2026',
    sessionTime: '10:00 AM',
    serviceName: 'Individual consultation',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const logoSection = { marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const logoDot = { color: '#FF9900' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-line' as const }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px 24px', margin: '0 0 16px' }
const detailLabel = { fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, margin: '0 0 4px', letterSpacing: '0.05em' }
const detailValue = { fontSize: '16px', color: '#0f172a', fontWeight: '600' as const, margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#6b7280', margin: '24px 0 0', whiteSpace: 'pre-line' as const }
