/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { ICON, StatusEmail, normalizeLang, timeWithZone, titleCaseName, type Lang } from './status-email.tsx'
import { LABELS } from './meeting-status-copy.ts'

const T: Record<Lang, { subject: string; title: string; intro: string; next: string; s1: string; s2: string; s3: string; outro: string }> = {
  uk: { subject: 'Ваш запит на зустріч отримано — очікуємо підтвердження', title: 'Ваш запит на зустріч отримано', intro: 'Спеціаліст отримав ваш запит. Зустріч очікує підтвердження.', next: 'Що далі?', s1: 'Ваш запит успішно надіслано.', s2: 'Спеціаліст має підтвердити зустріч.', s3: 'Ви отримаєте лист після підтвердження зустрічі.', outro: 'Наразі від вас не потрібно додаткових дій.' },
  en: { subject: 'Your meeting request has been received — awaiting confirmation', title: 'Your meeting request has been received', intro: 'The specialist has received your request. The meeting is awaiting confirmation.', next: 'What happens next?', s1: 'Your request was sent successfully.', s2: 'The specialist needs to confirm the meeting.', s3: 'You will receive an email once the meeting is confirmed.', outro: 'No further action is needed from you right now.' },
  ru: { subject: 'Ваш запрос на встречу получен — ожидаем подтверждения', title: 'Ваш запрос на встречу получен', intro: 'Специалист получил ваш запрос. Встреча ожидает подтверждения.', next: 'Что дальше?', s1: 'Ваш запрос успешно отправлен.', s2: 'Специалист должен подтвердить встречу.', s3: 'Вы получите письмо после подтверждения встречи.', outro: 'Сейчас от вас не требуется никаких действий.' },
  pl: { subject: 'Otrzymaliśmy Twoją prośbę o spotkanie — czekamy na potwierdzenie', title: 'Otrzymaliśmy Twoją prośbę o spotkanie', intro: 'Specjalista otrzymał Twoją prośbę. Spotkanie czeka na potwierdzenie.', next: 'Co dalej?', s1: 'Twoja prośba została wysłana.', s2: 'Specjalista musi potwierdzić spotkanie.', s3: 'Otrzymasz e-mail po potwierdzeniu spotkania.', outro: 'Na razie nie musisz nic więcej robić.' },
  fr: { subject: 'Votre demande de rendez-vous a été reçue — en attente de confirmation', title: 'Votre demande de rendez-vous a été reçue', intro: 'Le spécialiste a reçu votre demande. Le rendez-vous est en attente de confirmation.', next: 'Et ensuite ?', s1: 'Votre demande a bien été envoyée.', s2: 'Le spécialiste doit confirmer le rendez-vous.', s3: 'Vous recevrez un e-mail une fois le rendez-vous confirmé.', outro: 'Aucune action de votre part n’est requise pour le moment.' },
  de: { subject: 'Ihre Terminanfrage ist eingegangen — Bestätigung ausstehend', title: 'Ihre Terminanfrage ist eingegangen', intro: 'Die Fachperson hat Ihre Anfrage erhalten. Der Termin wartet auf Bestätigung.', next: 'Wie geht es weiter?', s1: 'Ihre Anfrage wurde erfolgreich gesendet.', s2: 'Die Fachperson muss den Termin bestätigen.', s3: 'Sie erhalten eine E-Mail, sobald der Termin bestätigt ist.', outro: 'Derzeit ist nichts weiter von Ihnen erforderlich.' },
}

interface Props { specialistName?: string; sessionDate?: string; sessionTime?: string; timezone?: string; language?: string }

const BookingRequestReceivedEmail = (p: Props) => {
  const lang = normalizeLang(p.language)
  const t = T[lang]; const L = LABELS[lang]
  return (
    <StatusEmail lang={lang} status="pending" preview={t.subject} title={t.title} intro={t.intro}
      details={[
        { icon: ICON.person, label: L.specialist, value: titleCaseName(p.specialistName) },
        { icon: ICON.calendar, label: L.proposedDate, value: p.sessionDate },
        { icon: ICON.clock, label: L.proposedTime, value: timeWithZone(p.sessionTime, p.timezone) },
      ]}
      stepsTitle={t.next}
      steps={[{ icon: ICON.check, text: t.s1 }, { icon: ICON.stepClock, text: t.s2 }, { icon: ICON.mail, text: t.s3 }]}
      note={t.outro} />
  )
}

export const template = {
  component: BookingRequestReceivedEmail,
  subject: (d: Record<string, any>) => T[normalizeLang(d?.language)].subject,
  displayName: 'Booking request received',
  previewData: { specialistName: 'Olga Stelmakh', sessionDate: '30 листопада 2026, понеділок', sessionTime: '09:00', timezone: 'Europe/Warsaw', language: 'uk' },
} satisfies TemplateEntry
