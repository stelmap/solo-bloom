/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SoloBizzShell, styles, BRAND } from '../email-templates/brand.tsx'

function titleCaseName(name?: string) {
  if (!name) return name
  const t = name.trim()
  if (!t || /\p{Ll}/u.test(t)) return t
  return t.toLocaleLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_m, a, b) => a + b.toLocaleUpperCase())
}

type Lang = 'en' | 'fr' | 'pl' | 'uk' | 'ru' | 'de'
function normalizeLang(value: unknown): Lang {
  const v = String(value || '').toLowerCase().slice(0, 2)
  return (['fr', 'pl', 'uk', 'ru', 'de'] as const).includes(v as any) ? (v as Lang) : 'en'
}

interface S {
  subject: string; title: string; intro: string; badge: string
  specialistLabel: string; dateLabel: string; timeLabel: string
  nextTitle: string; step1: string; step2: string; step3: string; outro: string
}

const STRINGS: Record<Lang, S> = {
  uk: { subject: 'Ваш запит на зустріч отримано — очікуємо підтвердження', title: 'Ваш запит на зустріч отримано', intro: 'Спеціаліст отримав ваш запит. Зустріч очікує підтвердження.', badge: 'Очікує підтвердження', specialistLabel: 'Спеціаліст', dateLabel: 'Запропонована дата', timeLabel: 'Запропонований час', nextTitle: 'Що далі?', step1: '✓ Ваш запит успішно надіслано.', step2: '◷ Спеціаліст має підтвердити зустріч.', step3: '✉ Ви отримаєте лист після підтвердження зустрічі.', outro: 'Наразі від вас не потрібно додаткових дій.' },
  en: { subject: 'Your meeting request has been received — awaiting confirmation', title: 'Your meeting request has been received', intro: 'The specialist has received your request. The meeting is awaiting confirmation.', badge: 'Awaiting confirmation', specialistLabel: 'Specialist', dateLabel: 'Requested date', timeLabel: 'Requested time', nextTitle: 'What happens next?', step1: '✓ Your request was sent successfully.', step2: '◷ The specialist needs to confirm the meeting.', step3: '✉ You will receive an email once the meeting is confirmed.', outro: 'No further action is needed from you right now.' },
  ru: { subject: 'Ваш запрос на встречу получен — ожидаем подтверждения', title: 'Ваш запрос на встречу получен', intro: 'Специалист получил ваш запрос. Встреча ожидает подтверждения.', badge: 'Ожидает подтверждения', specialistLabel: 'Специалист', dateLabel: 'Предложенная дата', timeLabel: 'Предложенное время', nextTitle: 'Что дальше?', step1: '✓ Ваш запрос успешно отправлен.', step2: '◷ Специалист должен подтвердить встречу.', step3: '✉ Вы получите письмо после подтверждения встречи.', outro: 'Сейчас от вас не требуется никаких действий.' },
  pl: { subject: 'Otrzymaliśmy Twoją prośbę o spotkanie — czekamy na potwierdzenie', title: 'Otrzymaliśmy Twoją prośbę o spotkanie', intro: 'Specjalista otrzymał Twoją prośbę. Spotkanie czeka na potwierdzenie.', badge: 'Oczekuje na potwierdzenie', specialistLabel: 'Specjalista', dateLabel: 'Proponowana data', timeLabel: 'Proponowana godzina', nextTitle: 'Co dalej?', step1: '✓ Twoja prośba została wysłana.', step2: '◷ Specjalista musi potwierdzić spotkanie.', step3: '✉ Otrzymasz e-mail po potwierdzeniu spotkania.', outro: 'Na razie nie musisz nic więcej robić.' },
  fr: { subject: 'Votre demande de rendez-vous a été reçue — en attente de confirmation', title: 'Votre demande de rendez-vous a été reçue', intro: 'Le spécialiste a reçu votre demande. Le rendez-vous est en attente de confirmation.', badge: 'En attente de confirmation', specialistLabel: 'Spécialiste', dateLabel: 'Date proposée', timeLabel: 'Heure proposée', nextTitle: 'Et ensuite ?', step1: '✓ Votre demande a bien été envoyée.', step2: '◷ Le spécialiste doit confirmer le rendez-vous.', step3: '✉ Vous recevrez un e-mail une fois le rendez-vous confirmé.', outro: 'Aucune action de votre part n’est requise pour le moment.' },
  de: { subject: 'Ihre Terminanfrage ist eingegangen — Bestätigung ausstehend', title: 'Ihre Terminanfrage ist eingegangen', intro: 'Die Fachperson hat Ihre Anfrage erhalten. Der Termin wartet auf Bestätigung.', badge: 'Wartet auf Bestätigung', specialistLabel: 'Fachperson', dateLabel: 'Vorgeschlagenes Datum', timeLabel: 'Vorgeschlagene Uhrzeit', nextTitle: 'Wie geht es weiter?', step1: '✓ Ihre Anfrage wurde erfolgreich gesendet.', step2: '◷ Die Fachperson muss den Termin bestätigen.', step3: '✉ Sie erhalten eine E-Mail, sobald der Termin bestätigt ist.', outro: 'Derzeit ist nichts weiter von Ihnen erforderlich.' },
}

interface Props { specialistName?: string; sessionDate?: string; sessionTime?: string; language?: string }

const BookingRequestReceivedEmail = ({ specialistName = '', sessionDate = '', sessionTime = '', language }: Props) => {
  const lang = normalizeLang(language)
  const T = STRINGS[lang]
  const name = titleCaseName(specialistName) || specialistName
  return (
    <SoloBizzShell lang={lang} preview={T.subject} tagline={T.badge} icon="" title={T.title} subtitle={T.intro}>
      <Text style={badge}>{T.badge}</Text>
      {name ? <Detail label={T.specialistLabel} value={name} /> : null}
      <Detail label={T.dateLabel} value={sessionDate} />
      <Detail label={T.timeLabel} value={sessionTime} />
      <Text style={{ ...styles.paragraph, marginTop: '16px', fontWeight: 700 }}>{T.nextTitle}</Text>
      <Text style={styles.paragraph}>{T.step1}<br />{T.step2}<br />{T.step3}</Text>
      <Text style={styles.smallMuted}>{T.outro}</Text>
    </SoloBizzShell>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Section style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </Section>
  )
}

const badge = {
  display: 'inline-block', backgroundColor: BRAND.amberBg, color: BRAND.amber, fontSize: '12px',
  fontWeight: 700, padding: '5px 12px', borderRadius: '999px', margin: '0 0 10px',
}

export const template = {
  component: BookingRequestReceivedEmail,
  subject: (data: Record<string, any>) => STRINGS[normalizeLang(data?.language)].subject,
  displayName: 'Booking request received',
  previewData: { specialistName: 'Olga Stelmakh', sessionDate: '30 листопада 2026, понеділок', sessionTime: '09:00', language: 'uk' },
} satisfies TemplateEntry
