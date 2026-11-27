/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { ICON, StatusEmail, normalizeLang, safeHttpsUrl, subjectWhen, timeWithZone, titleCaseName, type Lang } from './status-email.tsx'
import { LABELS } from './meeting-status-copy.ts'

const T: Record<Lang, { subject: string; title: string; intro: string; cta: string; note: string; closing: string }> = {
  uk: { subject: 'Вашу зустріч підтверджено', title: 'Вашу зустріч підтверджено!', intro: 'Ваша зустріч зі спеціалістом успішно заброньована.', cta: 'Додати до календаря', note: 'Перед початком зустрічі ви отримаєте нагадування.', closing: 'До зустрічі!' },
  en: { subject: 'Your meeting is confirmed', title: 'Your meeting is confirmed!', intro: 'Your meeting with the specialist has been booked successfully.', cta: 'Add to calendar', note: 'You will receive a reminder before the meeting starts.', closing: 'See you soon!' },
  ru: { subject: 'Ваша встреча подтверждена', title: 'Ваша встреча подтверждена!', intro: 'Ваша встреча со специалистом успешно забронирована.', cta: 'Добавить в календарь', note: 'Перед началом встречи вы получите напоминание.', closing: 'До встречи!' },
  pl: { subject: 'Twoje spotkanie zostało potwierdzone', title: 'Twoje spotkanie zostało potwierdzone!', intro: 'Spotkanie ze specjalistą zostało pomyślnie zarezerwowane.', cta: 'Dodaj do kalendarza', note: 'Przed rozpoczęciem spotkania otrzymasz przypomnienie.', closing: 'Do zobaczenia!' },
  fr: { subject: 'Votre rendez-vous est confirmé', title: 'Votre rendez-vous est confirmé !', intro: 'Votre rendez-vous avec le spécialiste a bien été réservé.', cta: 'Ajouter au calendrier', note: 'Vous recevrez un rappel avant le début du rendez-vous.', closing: 'À bientôt !' },
  de: { subject: 'Ihr Termin ist bestätigt', title: 'Ihr Termin ist bestätigt!', intro: 'Ihr Termin mit der Fachperson wurde erfolgreich gebucht.', cta: 'Zum Kalender hinzufügen', note: 'Vor Beginn des Termins erhalten Sie eine Erinnerung.', closing: 'Bis bald!' },
}

interface Props { specialistName?: string; sessionDate?: string; sessionTime?: string; timezone?: string; location?: string; joinUrl?: string; calendarUrl?: string; language?: string }

const BookingConfirmationEmail = (p: Props) => {
  const lang = normalizeLang(p.language)
  const t = T[lang]; const L = LABELS[lang]
  const join = safeHttpsUrl(p.joinUrl)
  return (
    <StatusEmail lang={lang} status="confirmed" preview={t.title} title={t.title} intro={t.intro}
      details={[
        { icon: ICON.person, label: L.specialist, value: titleCaseName(p.specialistName) },
        { icon: ICON.calendar, label: L.date, value: p.sessionDate },
        { icon: ICON.clock, label: L.time, value: timeWithZone(p.sessionTime, p.timezone) },
        { icon: ICON.mail, label: L.joinLink, value: join, href: join },
        { icon: ICON.calendar, label: L.address, value: join ? undefined : p.location },
      ]}
      cta={{ label: t.cta, href: safeHttpsUrl(p.calendarUrl) }} note={t.note} closing={t.closing} />
  )
}

export const template = {
  component: BookingConfirmationEmail,
  subject: (d: Record<string, any>) => [T[normalizeLang(d?.language)].subject, subjectWhen(d)].filter(Boolean).join(' — '),
  displayName: 'Booking confirmation',
  previewData: { specialistName: 'Olga Stelmakh', sessionDate: '30 листопада 2026, понеділок', sessionTime: '09:00', timezone: 'Europe/Warsaw', calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE', language: 'uk' },
} satisfies TemplateEntry
