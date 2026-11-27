/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { ICON, StatusEmail, normalizeLang, safeHttpsUrl, subjectWhen, timeWithZone, titleCaseName, type Lang } from './status-email.tsx'
import { LABELS } from './meeting-status-copy.ts'

const T: Record<Lang, { subject: string; title: string; intro: string; note: string; cta: string; closing: string }> = {
  uk: { subject: 'Вашу зустріч скасовано', title: 'Вашу зустріч скасовано', intro: 'Запланована зустріч зі спеціалістом не відбудеться.', note: 'Ви можете обрати інший зручний для вас час на сторінці запису спеціаліста.', cta: 'Обрати інший час', closing: 'Дякуємо за розуміння.' },
  en: { subject: 'Your meeting has been cancelled', title: 'Your meeting has been cancelled', intro: 'Your scheduled meeting with the specialist will not take place.', note: "You can choose another convenient time on the specialist's booking page.", cta: 'Choose another time', closing: 'Thank you for your understanding.' },
  ru: { subject: 'Ваша встреча отменена', title: 'Ваша встреча отменена', intro: 'Запланированная встреча со специалистом не состоится.', note: 'Вы можете выбрать другое удобное время на странице записи специалиста.', cta: 'Выбрать другое время', closing: 'Спасибо за понимание.' },
  pl: { subject: 'Twoje spotkanie zostało odwołane', title: 'Twoje spotkanie zostało odwołane', intro: 'Zaplanowane spotkanie ze specjalistą nie odbędzie się.', note: 'Możesz wybrać inny dogodny termin na stronie rezerwacji specjalisty.', cta: 'Wybierz inny termin', closing: 'Dziękujemy za zrozumienie.' },
  fr: { subject: 'Votre rendez-vous a été annulé', title: 'Votre rendez-vous a été annulé', intro: 'Le rendez-vous prévu avec le spécialiste n’aura pas lieu.', note: 'Vous pouvez choisir un autre horaire sur la page de réservation du spécialiste.', cta: 'Choisir un autre horaire', closing: 'Merci de votre compréhension.' },
  de: { subject: 'Ihr Termin wurde abgesagt', title: 'Ihr Termin wurde abgesagt', intro: 'Der geplante Termin mit der Fachperson findet nicht statt.', note: 'Sie können auf der Buchungsseite der Fachperson eine andere passende Zeit wählen.', cta: 'Andere Zeit wählen', closing: 'Vielen Dank für Ihr Verständnis.' },
}

interface Props { specialistName?: string; sessionDate?: string; sessionTime?: string; timezone?: string; cancellationReason?: string; bookingUrl?: string; language?: string }

const SessionCancellationEmail = (p: Props) => {
  const lang = normalizeLang(p.language)
  const t = T[lang]; const L = LABELS[lang]
  const booking = safeHttpsUrl(p.bookingUrl)
  return (
    <StatusEmail lang={lang} status="cancelled" preview={t.title} title={t.title} intro={t.intro}
      details={[
        { icon: ICON.person, label: L.specialist, value: titleCaseName(p.specialistName) },
        { icon: ICON.calendar, label: L.cancelledDate, value: p.sessionDate, strike: true },
        { icon: ICON.clock, label: L.time, value: timeWithZone(p.sessionTime, p.timezone), strike: true },
        { icon: ICON.mail, label: L.reason, value: p.cancellationReason },
      ]}
      note={booking ? t.note : undefined} cta={{ label: t.cta, href: booking }} closing={t.closing} />
  )
}

export const template = {
  component: SessionCancellationEmail,
  subject: (d: Record<string, any>) => [T[normalizeLang(d?.language)].subject, subjectWhen(d)].filter(Boolean).join(' — '),
  displayName: 'Meeting cancellation',
  previewData: { specialistName: 'Olga Stelmakh', sessionDate: '30 листопада 2026, понеділок', sessionTime: '09:00', timezone: 'Europe/Warsaw', bookingUrl: 'https://solo-bizz.com/book/example', language: 'uk' },
} satisfies TemplateEntry
