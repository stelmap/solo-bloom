/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { ICON, StatusEmail, normalizeLang, safeHttpsUrl, subjectWhen, timeWithZone, titleCaseName, type Lang } from './status-email.tsx'
import { LABELS } from './meeting-status-copy.ts'

const T: Record<Lang, { subject: string; title: string; intro: string; note: string; cta: string }> = {
  uk: { subject: 'Вашу зустріч не підтверджено', title: 'Вашу зустріч не підтверджено', intro: 'На жаль, спеціаліст не зміг підтвердити зустріч на обраний вами час.', note: 'Ви можете обрати інший доступний час та надіслати новий запит на зустріч.', cta: 'Записатися на інший час' },
  en: { subject: 'Your meeting was not confirmed', title: 'Your meeting was not confirmed', intro: 'Unfortunately, the specialist could not confirm the meeting at the time you chose.', note: 'You can choose another available time and send a new meeting request.', cta: 'Book another time' },
  ru: { subject: 'Ваша встреча не подтверждена', title: 'Ваша встреча не подтверждена', intro: 'К сожалению, специалист не смог подтвердить встречу на выбранное вами время.', note: 'Вы можете выбрать другое доступное время и отправить новый запрос на встречу.', cta: 'Записаться на другое время' },
  pl: { subject: 'Twoje spotkanie nie zostało potwierdzone', title: 'Twoje spotkanie nie zostało potwierdzone', intro: 'Niestety specjalista nie mógł potwierdzić spotkania w wybranym przez Ciebie terminie.', note: 'Możesz wybrać inny dostępny termin i wysłać nową prośbę o spotkanie.', cta: 'Umów inny termin' },
  fr: { subject: 'Votre rendez-vous n’a pas été confirmé', title: 'Votre rendez-vous n’a pas été confirmé', intro: 'Malheureusement, le spécialiste n’a pas pu confirmer le rendez-vous à l’horaire choisi.', note: 'Vous pouvez choisir un autre horaire disponible et envoyer une nouvelle demande.', cta: 'Réserver un autre horaire' },
  de: { subject: 'Ihr Termin wurde nicht bestätigt', title: 'Ihr Termin wurde nicht bestätigt', intro: 'Leider konnte die Fachperson den Termin zur gewählten Zeit nicht bestätigen.', note: 'Sie können eine andere verfügbare Zeit wählen und eine neue Terminanfrage senden.', cta: 'Andere Zeit buchen' },
}

interface Props { specialistName?: string; sessionDate?: string; sessionTime?: string; timezone?: string; bookingUrl?: string; language?: string }

const BookingDeclinedEmail = (p: Props) => {
  const lang = normalizeLang(p.language)
  const t = T[lang]; const L = LABELS[lang]
  const booking = safeHttpsUrl(p.bookingUrl)
  const when = [p.sessionDate, timeWithZone(p.sessionTime, p.timezone)].filter(Boolean).join(', ')
  return (
    <StatusEmail lang={lang} status="declined" preview={t.title} title={t.title} intro={t.intro}
      details={[
        { icon: ICON.person, label: L.specialist, value: titleCaseName(p.specialistName) },
        { icon: ICON.calendar, label: L.proposedWhen, value: when },
      ]}
      note={booking ? t.note : undefined} cta={{ label: t.cta, href: booking }} />
  )
}

export const template = {
  component: BookingDeclinedEmail,
  subject: (d: Record<string, any>) => [T[normalizeLang(d?.language)].subject, subjectWhen(d)].filter(Boolean).join(' — '),
  displayName: 'Booking request declined',
  previewData: { specialistName: 'Olga Stelmakh', sessionDate: '30 листопада 2026', sessionTime: '09:00', timezone: 'Europe/Warsaw', bookingUrl: 'https://solo-bizz.com/book/example', language: 'uk' },
} satisfies TemplateEntry
