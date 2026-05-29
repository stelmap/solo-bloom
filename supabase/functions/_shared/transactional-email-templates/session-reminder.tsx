/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Solo.Bizz"

// Normalize ALL-CAPS or lower-case names into Title Case so the header
// doesn't shout (e.g. "OLGA STELMAKH" -> "Olga Stelmakh").
function titleCaseName(name?: string) {
  if (!name) return name
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  // Only re-case if the name has no lowercase letter (i.e. it's all caps).
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
  badgeConfirmed: string
  badgeAwaiting: string
  badgeReminder: string
  greeting: (name: string) => string
  intro: (specialist: string) => React.ReactNode
  dateLabel: string
  timeLabel: string
  formatLabel: string
  formatOnline: string
  formatOnlineHint: string
  formatInPerson: string
  formatPhone: string
  formatPhoneHint: string
  confirmBtn: string
  confirmedBtn: string
  rescheduleQ: string
  rescheduleLink: string
  footer: string
  htmlLang: string
}> = {
  en: {
    preview: 'Reminder: Your upcoming session',
    subject: 'Reminder: Your upcoming session',
    label: 'SESSION REMINDER',
    badgeConfirmed: 'Confirmed appointment',
    badgeAwaiting: 'Awaiting confirmation',
    badgeReminder: 'Session reminder',
    greeting: (n) => `See you soon, ${n} 👋`,
    intro: (s) => <>Just a warm reminder that your upcoming session with <strong>{s}</strong> is right around the corner. You're doing great — see you there.</>,
    dateLabel: 'DATE',
    timeLabel: 'TIME',
    formatLabel: 'FORMAT',
    formatOnline: 'Online session',
    formatOnlineHint: 'Link will appear 10 min before start',
    formatInPerson: 'In-person session',
    formatPhone: 'Phone session',
    formatPhoneHint: 'Your specialist will call you',
    confirmBtn: 'Confirm my session',
    confirmedBtn: 'Session confirmed',
    rescheduleQ: 'Need to reschedule?',
    rescheduleLink: 'Click here',
    footer: `You received this reminder because you have a booking with a ${SITE_NAME} practitioner.`,
    htmlLang: 'en',
  },
  fr: {
    preview: 'Rappel : votre prochaine séance',
    subject: 'Rappel : votre prochaine séance',
    label: 'RAPPEL DE SÉANCE',
    badgeConfirmed: 'Rendez-vous confirmé',
    badgeAwaiting: 'En attente de confirmation',
    badgeReminder: 'Rappel de séance',
    greeting: (n) => `À très vite, ${n} 👋`,
    intro: (s) => <>Petit rappel chaleureux : votre prochaine séance avec <strong>{s}</strong> approche. Tout va bien se passer — à très vite.</>,
    dateLabel: 'DATE',
    timeLabel: 'HEURE',
    formatLabel: 'FORMAT',
    formatOnline: 'Séance en ligne',
    formatOnlineHint: 'Le lien apparaîtra 10 min avant le début',
    formatInPerson: 'Séance en personne',
    formatPhone: 'Séance téléphonique',
    formatPhoneHint: 'Votre spécialiste vous appellera',
    confirmBtn: 'Confirmer ma séance',
    confirmedBtn: 'Séance confirmée',
    rescheduleQ: 'Besoin de reporter ?',
    rescheduleLink: 'Cliquez ici',
    footer: `Vous recevez ce rappel car vous avez une réservation avec un praticien ${SITE_NAME}.`,
    htmlLang: 'fr',
  },
  pl: {
    preview: 'Przypomnienie: Twoja nadchodząca sesja',
    subject: 'Przypomnienie: Twoja nadchodząca sesja',
    label: 'PRZYPOMNIENIE O SESJI',
    badgeConfirmed: 'Wizyta potwierdzona',
    badgeAwaiting: 'Oczekuje potwierdzenia',
    badgeReminder: 'Przypomnienie o sesji',
    greeting: (n) => `Do zobaczenia wkrótce, ${n} 👋`,
    intro: (s) => <>Przyjazne przypomnienie — Twoja nadchodząca sesja z <strong>{s}</strong> jest tuż za rogiem. Do zobaczenia.</>,
    dateLabel: 'DATA',
    timeLabel: 'GODZINA',
    formatLabel: 'FORMAT',
    formatOnline: 'Sesja online',
    formatOnlineHint: 'Link pojawi się 10 min przed rozpoczęciem',
    formatInPerson: 'Sesja stacjonarna',
    formatPhone: 'Sesja telefoniczna',
    formatPhoneHint: 'Specjalista zadzwoni do Ciebie',
    confirmBtn: 'Potwierdź sesję',
    confirmedBtn: 'Sesja potwierdzona',
    rescheduleQ: 'Musisz przełożyć?',
    rescheduleLink: 'Kliknij tutaj',
    footer: `Otrzymujesz to przypomnienie, ponieważ masz rezerwację u specjalisty ${SITE_NAME}.`,
    htmlLang: 'pl',
  },
  uk: {
    preview: 'Нагадування: ваш найближчий сеанс',
    subject: 'Нагадування: ваш найближчий сеанс',
    label: 'НАГАДУВАННЯ ПРО СЕАНС',
    badgeConfirmed: 'Зустріч підтверджено',
    badgeAwaiting: 'Очікує підтвердження',
    badgeReminder: 'Нагадування про сеанс',
    greeting: (n) => `До зустрічі, ${n} 👋`,
    intro: (s) => <>Тепле нагадування: ваш найближчий сеанс із <strong>{s}</strong> зовсім скоро. Усе буде добре — до зустрічі.</>,
    dateLabel: 'ДАТА',
    timeLabel: 'ЧАС',
    formatLabel: 'ФОРМАТ',
    formatOnline: 'Онлайн-сеанс',
    formatOnlineHint: 'Посилання з’явиться за 10 хв до початку',
    formatInPerson: 'Особиста зустріч',
    formatPhone: 'Телефонний сеанс',
    formatPhoneHint: 'Спеціаліст зателефонує вам',
    confirmBtn: 'Підтвердити сеанс',
    confirmedBtn: 'Сеанс підтверджено',
    rescheduleQ: 'Потрібно перенести?',
    rescheduleLink: 'Натисніть тут',
    footer: `Ви отримали це нагадування, бо маєте бронювання у спеціаліста ${SITE_NAME}.`,
    htmlLang: 'uk',
  },
}

interface SessionReminderProps {
  clientName?: string
  specialistName?: string
  businessName?: string
  specialistTitle?: string
  avatarUrl?: string
  sessionDate?: string
  sessionTime?: string            // e.g. "14:00 – 15:00"
  timezoneLabel?: string          // e.g. "Central European Time (CET)"
  format?: 'online' | 'in_person' | 'phone'
  meetingUrl?: string
  locationText?: string           // for in-person
  therapistMessage?: string       // optional personal note
  confirmationUrl?: string
  confirmationStatus?: 'confirmed' | 'pending' | 'not_required'
  rescheduleUrl?: string
  language?: string
}

function initials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

const SessionReminderEmail = ({
  clientName = 'Client',
  specialistName = 'your specialist',
  businessName,
  specialistTitle,
  avatarUrl,
  sessionDate = '',
  sessionTime = '',
  timezoneLabel,
  format = 'online',
  meetingUrl,
  locationText,
  therapistMessage,
  confirmationUrl,
  confirmationStatus = 'not_required',
  rescheduleUrl,
  language,
}: SessionReminderProps) => {
  const T = STRINGS[normalizeLang(language)]
  const isConfirmed = confirmationStatus === 'confirmed'
  const isAwaiting = confirmationStatus === 'pending' || (!!confirmationUrl && !isConfirmed)
  const badgeText = isConfirmed ? T.badgeConfirmed : isAwaiting ? T.badgeAwaiting : T.badgeReminder
  const badgeStyle = isConfirmed ? badgeConfirmed : isAwaiting ? badgeAwaiting : badgeNeutral

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
            <table cellPadding={0} cellSpacing={0} role="presentation" style={{ marginTop: 18 }}>
              <tr>
                <td style={{ verticalAlign: 'middle', paddingRight: 14 }}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" width={48} height={48} style={avatarImg} />
                  ) : (
                    <div style={avatarFallback}>{initials(displaySpecialistName)}</div>
                  )}
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={specName}>{displaySpecialistName}</Text>
                  {subtitle && <Text style={specSub}>{subtitle}</Text>}
                </td>
              </tr>
            </table>
          </Section>

          {/* Body */}
          <Section style={bodySection}>
            <div style={badgeStyle}>{isConfirmed ? '✓ ' : ''}{badgeText}</div>
            <Heading style={h1}>{T.greeting(clientName)}</Heading>
            <Text style={lead}>{T.intro(displaySpecialistName)}</Text>


            {/* Details card */}
            <Section style={detailsCard}>
              <Row label={T.dateLabel} value={sessionDate} icon="📅" />
              <div style={divider} />
              <Row
                label={T.timeLabel}
                value={sessionTime}
                sub={timezoneLabel}
                icon="🕐"
              />
            </Section>

            {therapistMessage && (
              <Section style={noteCard}>
                <Text style={noteText}>“{therapistMessage}”</Text>
                <Text style={noteSig}>— {displaySpecialistName}</Text>
              </Section>
            )}

            {/* CTA */}
            <Section style={{ textAlign: 'center' as const, margin: '32px 0 8px' }}>
              {isConfirmed ? (
                <div style={btnDisabled}>✓ {T.confirmedBtn}</div>
              ) : confirmationUrl ? (
                <Button style={btnPrimary} href={confirmationUrl}>{T.confirmBtn}</Button>
              ) : null}
              {rescheduleUrl && (
                <Text style={rescheduleRow}>
                  {T.rescheduleQ}{' '}
                  <Link href={rescheduleUrl} style={rescheduleLinkStyle}>{T.rescheduleLink}</Link>
                </Text>
              )}
            </Section>
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

function Row({ label, value, sub, link, icon }: {
  label: string; value: string; sub?: string; link?: string; icon?: string
}) {
  return (
    <table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: '100%' }}>
      <tr>
        <td style={{ width: 48, verticalAlign: 'top', paddingTop: 4 }}>
          <div style={iconBox}>{icon}</div>
        </td>
        <td style={{ verticalAlign: 'top' }}>
          <Text style={rowLabel}>{label}</Text>
          <Text style={rowValue}>{value}</Text>
          {sub && <Text style={rowSub}>{sub}</Text>}
          {link && (
            <Text style={rowSub}>
              <Link href={link} style={{ color: '#FF9900', textDecoration: 'underline' }}>{link}</Link>
            </Text>
          )}
        </td>
      </tr>
    </table>
  )
}

export const template = {
  component: SessionReminderEmail,
  subject: (data: Record<string, any>) => STRINGS[normalizeLang(data?.language)].subject,
  displayName: 'Session reminder',
  previewData: {
    clientName: 'Harry',
    specialistName: 'Dr. Anna Kovalenko',
    businessName: 'Cognitive Behavioural Therapy',
    specialistTitle: 'Psychotherapist',
    sessionDate: 'Thursday, 28 May 2026',
    sessionTime: '14:00 – 15:00',
    timezoneLabel: 'Central European Time (CET)',
    format: 'online',
    confirmationUrl: 'https://example.com/confirm-session?token=abc123',
    confirmationStatus: 'confirmed',
    therapistMessage: 'Looking forward to our session, Harry. We’ll continue working on the techniques we started last time — no need to prepare anything special, just come as you are.',
    language: 'en',
  },
} satisfies TemplateEntry

// ----- styles -----
// Cyrillic-safe font stack — matches the Solo.Bizz product UI and falls back to
// system fonts that fully cover Cyrillic glyphs so the reminder doesn't render
// in a mismatched fallback typeface in Gmail / Outlook.
const FONT_STACK = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const SERIF_STACK = "'Instrument Serif', 'DM Serif Display', 'Times New Roman', Georgia, serif"

const main = { backgroundColor: '#ffffff', fontFamily: FONT_STACK, margin: 0, padding: '24px 12px' }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f0eee9', fontFamily: FONT_STACK }

const header = { backgroundColor: '#11122b', padding: '28px 28px 26px', color: '#ffffff', fontFamily: FONT_STACK }
const logo = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: 0, fontFamily: FONT_STACK }
const logoDot = { color: '#FF9900' }
const headerLabel = { fontSize: '11px', color: '#8a8ca6', fontWeight: 'bold' as const, letterSpacing: '0.18em', margin: '22px 0 0', fontFamily: FONT_STACK }
const avatarImg = { borderRadius: '999px', display: 'block' as const, objectFit: 'cover' as const }
const avatarFallback = { width: 48, height: 48, borderRadius: 999, backgroundColor: '#FF9900', color: '#11122b', fontWeight: 'bold' as const, fontSize: 16, lineHeight: '48px', textAlign: 'center' as const, fontFamily: FONT_STACK }
const specName = { fontSize: '17px', fontWeight: 'bold' as const, color: '#ffffff', margin: 0, lineHeight: 1.2, fontFamily: FONT_STACK }
const specSub = { fontSize: '13px', color: '#b4b6cf', margin: '4px 0 0', fontFamily: FONT_STACK }

const bodySection = { padding: '28px 28px 8px', fontFamily: FONT_STACK }
const badgeBase = { display: 'inline-block', fontSize: '12px', fontWeight: 'bold' as const, padding: '6px 12px', borderRadius: '999px', margin: '0 0 16px', fontFamily: FONT_STACK }
const badgeConfirmed = { ...badgeBase, backgroundColor: '#e6f7ed', color: '#1f9d55' }
const badgeAwaiting = { ...badgeBase, backgroundColor: '#fff4e0', color: '#b8731a' }
const badgeNeutral = { ...badgeBase, backgroundColor: '#eef0f7', color: '#4a4d6a' }

const h1 = { fontSize: '30px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.15, fontFamily: SERIF_STACK }
const lead = { fontSize: '15px', color: '#5b6076', lineHeight: 1.6, margin: '0 0 24px', fontFamily: FONT_STACK }

const detailsCard = { backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f0eee9', borderLeft: '3px solid #FF9900', padding: '20px 22px', margin: '0 0 20px', fontFamily: FONT_STACK }
const iconBox = { width: 36, height: 36, borderRadius: 10, backgroundColor: '#11122b', color: '#FF9900', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '36px', textAlign: 'center' as const, fontSize: 16 }
const rowLabel = { fontSize: '11px', color: '#8a8ca6', fontWeight: 'bold' as const, letterSpacing: '0.12em', margin: '0 0 4px' }
const rowValue = { fontSize: '16px', color: '#0f172a', fontWeight: 'bold' as const, margin: 0 }
const rowSub = { fontSize: '13px', color: '#8a8ca6', margin: '4px 0 0' }
const divider = { height: 1, backgroundColor: '#e8e5dc', margin: '14px 0' }

const noteCard = { backgroundColor: '#fdf6e7', borderRadius: '14px', padding: '18px 20px', margin: '8px 0 0' }
const noteText = { fontSize: '14px', color: '#5b4a23', fontStyle: 'italic' as const, lineHeight: 1.6, margin: 0 }
const noteSig = { fontSize: '13px', color: '#5b4a23', margin: '12px 0 0' }

const btnPrimary = { backgroundColor: '#FF9900', color: '#11122b', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 36px', textDecoration: 'none', display: 'inline-block' }
const btnDisabled = { backgroundColor: '#e6f7ed', color: '#1f9d55', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 36px', display: 'inline-block' }
const rescheduleRow = { fontSize: '13px', color: '#8a8ca6', margin: '14px 0 0', textAlign: 'center' as const }
const rescheduleLinkStyle = { color: '#FF9900', fontWeight: 'bold' as const, textDecoration: 'none' }

const footerSection = { padding: '24px 28px 28px', borderTop: '1px solid #f0eee9', textAlign: 'center' as const }
const footerBrand = { fontSize: '14px', color: '#0f172a', fontWeight: 'bold' as const, margin: '0 0 8px' }
const footerText = { fontSize: '12px', color: '#8a8ca6', margin: 0, lineHeight: 1.6 }
