/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SoloBizzShell, styles, BRAND } from '../email-templates/brand.tsx'

const SITE_NAME = 'Solo .Bizz'

// Normalize ALL-CAPS names into Title Case so the header doesn't shout.
function titleCaseName(name?: string) {
  if (!name) return name
  const trimmed = name.trim()
  if (!trimmed || /\p{Ll}/u.test(trimmed)) return trimmed
  return trimmed
    .toLocaleLowerCase()
    .split(/(\s+|[-'’])/)
    .map((part) => (/^\s+$/.test(part) || part === '-' || part === "'" || part === '’'
      ? part
      : part.charAt(0).toLocaleUpperCase() + part.slice(1)))
    .join('')
}

type Lang = 'en' | 'fr' | 'pl' | 'uk' | 'ru' | 'de'
function normalizeLang(value: unknown): Lang {
  const v = String(value || '').toLowerCase().slice(0, 2)
  return (['fr', 'pl', 'uk', 'ru', 'de'] as const).includes(v as any) ? (v as Lang) : 'en'
}

const STRINGS: Record<Lang, {
  subject: string
  tagline: string
  badge: string
  greeting: (n: string) => string
  intro: (s: string) => React.ReactNode
  specialistLabel: string
  dateLabel: string
  timeLabel: string
  serviceLabel: string
  outro: string
  footer: string
}> = {
  en: {
    subject: 'Your meeting has been confirmed',
    tagline: 'Meeting confirmed',
    badge: 'Confirmed',
    greeting: (n) => `See you soon, ${n}`,
    intro: (s) => <>Great news — your meeting with <strong>{s}</strong> has been confirmed.</>,
    specialistLabel: 'Specialist', dateLabel: 'Date', timeLabel: 'Time', serviceLabel: 'Service',
    outro: 'You will receive a reminder before the meeting starts.',
    footer: `You received this confirmation because you have a booking with a ${SITE_NAME} practitioner.`,
  },
  fr: {
    subject: 'Votre rendez-vous est confirmé',
    tagline: 'Rendez-vous confirmé',
    badge: 'Confirmé',
    greeting: (n) => `À très vite, ${n}`,
    intro: (s) => <>Bonne nouvelle — votre rendez-vous avec <strong>{s}</strong> est confirmé.</>,
    specialistLabel: 'Spécialiste', dateLabel: 'Date', timeLabel: 'Heure', serviceLabel: 'Service',
    outro: 'Vous recevrez un rappel avant le début du rendez-vous.',
    footer: `Vous recevez cette confirmation car vous avez une réservation avec un praticien ${SITE_NAME}.`,
  },
  pl: {
    subject: 'Twoje spotkanie zostało potwierdzone',
    tagline: 'Spotkanie potwierdzone',
    badge: 'Potwierdzone',
    greeting: (n) => `Do zobaczenia wkrótce, ${n}`,
    intro: (s) => <>Dobra wiadomość — Twoje spotkanie z <strong>{s}</strong> zostało potwierdzone.</>,
    specialistLabel: 'Specjalista', dateLabel: 'Data', timeLabel: 'Godzina', serviceLabel: 'Usługa',
    outro: 'Otrzymasz przypomnienie przed rozpoczęciem spotkania.',
    footer: `Otrzymujesz to potwierdzenie, ponieważ masz rezerwację u specjalisty ${SITE_NAME}.`,
  },
  uk: {
    subject: 'Вашу зустріч підтверджено',
    tagline: 'Зустріч підтверджено',
    badge: 'Підтверджено',
    greeting: (n) => `До зустрічі, ${n}`,
    intro: (s) => <>Гарні новини — вашу зустріч із <strong>{s}</strong> підтверджено.</>,
    specialistLabel: 'Спеціаліст', dateLabel: 'Дата', timeLabel: 'Час', serviceLabel: 'Послуга',
    outro: 'Ви отримаєте нагадування перед початком зустрічі.',
    footer: `Ви отримали це підтвердження, бо маєте бронювання у спеціаліста ${SITE_NAME}.`,
  },
  ru: {
    subject: 'Ваша встреча подтверждена',
    tagline: 'Встреча подтверждена',
    badge: 'Подтверждено',
    greeting: (n) => `До встречи, ${n}`,
    intro: (s) => <>Отличные новости — ваша встреча с <strong>{s}</strong> подтверждена.</>,
    specialistLabel: 'Специалист', dateLabel: 'Дата', timeLabel: 'Время', serviceLabel: 'Услуга',
    outro: 'Вы получите напоминание перед началом встречи.',
    footer: `Вы получили это подтверждение, потому что у вас есть бронирование у специалиста ${SITE_NAME}.`,
  },
  de: {
    subject: 'Ihr Termin wurde bestätigt',
    tagline: 'Termin bestätigt',
    badge: 'Bestätigt',
    greeting: (n) => `Bis bald, ${n}`,
    intro: (s) => <>Gute Nachricht — Ihr Termin mit <strong>{s}</strong> wurde bestätigt.</>,
    specialistLabel: 'Fachperson', dateLabel: 'Datum', timeLabel: 'Uhrzeit', serviceLabel: 'Leistung',
    outro: 'Sie erhalten vor Beginn des Termins eine Erinnerung.',
    footer: `Sie erhalten diese Bestätigung, weil Sie eine Buchung bei einer ${SITE_NAME}-Fachperson haben.`,
  },
}

interface BookingConfirmationProps {
  clientName?: string
  specialistName?: string
  businessName?: string
  specialistTitle?: string
  sessionDate?: string
  sessionTime?: string
  serviceName?: string
  language?: string
}

const BookingConfirmationEmail = ({
  clientName = 'Client',
  specialistName = 'your specialist',
  businessName,
  specialistTitle,
  sessionDate = '',
  sessionTime = '',
  serviceName,
  language,
}: BookingConfirmationProps) => {
  const lang = normalizeLang(language)
  const T = STRINGS[lang]
  const name = titleCaseName(specialistName) || specialistName
  const subtitle = [specialistTitle, businessName].filter(Boolean).join(' · ')

  return (
    <SoloBizzShell
      lang={lang}
      preview={T.subject}
      tagline={T.tagline}
      icon=""
      title={T.greeting(clientName)}
      subtitle={T.intro(name)}
    >
      <Text style={badge}>{T.badge}</Text>
      <Detail label={T.specialistLabel} value={name} sub={subtitle} />
      <Detail label={T.dateLabel} value={sessionDate} />
      <Detail label={T.timeLabel} value={sessionTime} />
      {serviceName ? <Detail label={T.serviceLabel} value={serviceName} /> : null}
      <Text style={{ ...styles.paragraph, marginTop: '16px' }}>{T.outro}</Text>
      <Text style={styles.smallMuted}>{T.footer}</Text>
    </SoloBizzShell>
  )
}

function Detail({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Section style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
      {sub ? <Text style={{ ...styles.footerText, marginTop: '2px' }}>{sub}</Text> : null}
    </Section>
  )
}

const badge = {
  display: 'inline-block',
  backgroundColor: BRAND.greenBg,
  color: BRAND.green,
  fontSize: '12px',
  fontWeight: 700,
  padding: '5px 12px',
  borderRadius: '999px',
  margin: '0 0 10px',
}

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) => STRINGS[normalizeLang(data?.language)].subject,
  displayName: 'Booking confirmation',
  previewData: {
    clientName: 'Jane',
    specialistName: 'Dr. Anna Kovalenko',
    businessName: 'Cognitive Behavioural Therapy',
    specialistTitle: 'Psychotherapist',
    sessionDate: 'Thursday, 30 May 2026',
    sessionTime: '10:00 – 11:00',
    serviceName: 'Individual consultation',
    language: 'uk',
  },
} satisfies TemplateEntry
