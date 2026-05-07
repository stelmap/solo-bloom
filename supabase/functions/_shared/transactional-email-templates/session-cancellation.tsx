/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
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
  body: string
  dateLabel: string
  timeLabel: string
  reasonLabel: string
  defaultReason: string
  reschedule: string
  signature: string
  htmlLang: string
}> = {
  en: {
    preview: 'Your session has been cancelled',
    subject: 'Your session has been cancelled',
    heading: 'Session Cancelled',
    greeting: (n) => `Hi ${n},`,
    body: "We're sorry to inform you that your upcoming session has been cancelled.",
    dateLabel: '📅 Date',
    timeLabel: '🕐 Time',
    reasonLabel: 'Reason',
    defaultReason: 'The specialist marked this time as unavailable.',
    reschedule: 'Please contact your specialist to reschedule at a convenient time.',
    signature: `— The ${SITE_NAME} Team`,
    htmlLang: 'en',
  },
  fr: {
    preview: 'Votre séance a été annulée',
    subject: 'Votre séance a été annulée',
    heading: 'Séance annulée',
    greeting: (n) => `Bonjour ${n},`,
    body: 'Nous avons le regret de vous informer que votre prochaine séance a été annulée.',
    dateLabel: '📅 Date',
    timeLabel: '🕐 Heure',
    reasonLabel: 'Motif',
    defaultReason: 'Le spécialiste a marqué ce créneau comme indisponible.',
    reschedule: 'Contactez votre spécialiste pour reprogrammer à un moment qui vous convient.',
    signature: `— L'équipe ${SITE_NAME}`,
    htmlLang: 'fr',
  },
  pl: {
    preview: 'Twoja sesja została odwołana',
    subject: 'Twoja sesja została odwołana',
    heading: 'Sesja odwołana',
    greeting: (n) => `Cześć ${n},`,
    body: 'Z przykrością informujemy, że Twoja nadchodząca sesja została odwołana.',
    dateLabel: '📅 Data',
    timeLabel: '🕐 Godzina',
    reasonLabel: 'Powód',
    defaultReason: 'Specjalista oznaczył ten termin jako niedostępny.',
    reschedule: 'Skontaktuj się ze specjalistą, aby ustalić nowy termin.',
    signature: `— Zespół ${SITE_NAME}`,
    htmlLang: 'pl',
  },
  uk: {
    preview: 'Ваш сеанс було скасовано',
    subject: 'Ваш сеанс було скасовано',
    heading: 'Сеанс скасовано',
    greeting: (n) => `Вітаємо, ${n},`,
    body: 'На жаль, повідомляємо, що ваш найближчий сеанс було скасовано.',
    dateLabel: '📅 Дата',
    timeLabel: '🕐 Час',
    reasonLabel: 'Причина',
    defaultReason: 'Спеціаліст позначив цей час як недоступний.',
    reschedule: 'Зв’яжіться зі спеціалістом, щоб перенести сеанс на зручний час.',
    signature: `— Команда ${SITE_NAME}`,
    htmlLang: 'uk',
  },
}

interface SessionCancellationProps {
  clientName?: string
  sessionDate?: string
  sessionTime?: string
  cancellationReason?: string
  language?: string
}

const SessionCancellationEmail = ({
  clientName = 'Client',
  sessionDate = '',
  sessionTime = '',
  cancellationReason,
  language,
}: SessionCancellationProps) => {
  const T = STRINGS[normalizeLang(language)]
  const reason = cancellationReason || T.defaultReason
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
          <Text style={text}>{T.body}</Text>
          <Section style={detailsBox}>
            <Text style={detailLabel}>{T.dateLabel}</Text>
            <Text style={detailValue}>{sessionDate}</Text>
            <Text style={detailLabel}>{T.timeLabel}</Text>
            <Text style={detailValue}>{sessionTime}</Text>
          </Section>
          <Section style={reasonBox}>
            <Text style={reasonLabel}>{T.reasonLabel}</Text>
            <Text style={reasonText}>{reason}</Text>
          </Section>
          <Text style={text}>{T.reschedule}</Text>
          <Text style={footer}>{T.signature}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SessionCancellationEmail,
  subject: (data: Record<string, any>) => STRINGS[normalizeLang(data?.language)].subject,
  displayName: 'Session cancellation',
  previewData: {
    clientName: 'Jane Doe',
    sessionDate: 'April 10, 2026',
    sessionTime: '10:00 AM',
    cancellationReason: 'The specialist marked this time as unavailable.',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const logoSection = { marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const logoDot = { color: '#FF9900' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#dc2626', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px 24px', margin: '0 0 8px' }
const detailLabel = { fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, margin: '0 0 4px', letterSpacing: '0.05em' }
const detailValue = { fontSize: '16px', color: '#0f172a', fontWeight: '600' as const, margin: '0 0 16px' }
const reasonBox = { backgroundColor: '#fef2f2', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #dc2626' }
const reasonLabel = { fontSize: '12px', color: '#dc2626', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, margin: '0 0 4px' }
const reasonText = { fontSize: '14px', color: '#991b1b', margin: '0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
