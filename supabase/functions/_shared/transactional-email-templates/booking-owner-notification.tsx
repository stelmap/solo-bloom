/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

type Lang = 'uk' | 'en' | 'pl' | 'de' | 'fr' | 'ru'
const L: Record<Lang, Record<string, string>> = {
  uk: { subject: 'Новий запис на зустріч', title: 'Новий запис на зустріч', client: 'Клієнт', date: 'Дата', time: 'Час', service: 'Послуга', duration: 'Тривалість', min: 'хв', price: 'Ціна', contact: 'Контакт клієнта', comment: 'Коментар клієнта', status: 'Статус', pending: 'Очікує підтвердження', confirmed: 'Підтверджено', cta: 'Переглянути зустріч' },
  en: { subject: 'New meeting booking', title: 'New meeting booked', client: 'Client', date: 'Date', time: 'Time', service: 'Service', duration: 'Duration', min: 'min', price: 'Price', contact: 'Client contact', comment: 'Client comment', status: 'Status', pending: 'Awaiting confirmation', confirmed: 'Confirmed', cta: 'View meeting' },
  pl: { subject: 'Nowa rezerwacja spotkania', title: 'Nowe spotkanie zarezerwowane', client: 'Klient', date: 'Data', time: 'Godzina', service: 'Usługa', duration: 'Czas trwania', min: 'min', price: 'Cena', contact: 'Kontakt klienta', comment: 'Komentarz klienta', status: 'Status', pending: 'Oczekuje na potwierdzenie', confirmed: 'Potwierdzone', cta: 'Zobacz spotkanie' },
  de: { subject: 'Neue Terminbuchung', title: 'Neuer Termin gebucht', client: 'Klient', date: 'Datum', time: 'Uhrzeit', service: 'Leistung', duration: 'Dauer', min: 'Min.', price: 'Preis', contact: 'Kontakt', comment: 'Kommentar', status: 'Status', pending: 'Wartet auf Bestätigung', confirmed: 'Bestätigt', cta: 'Termin ansehen' },
  fr: { subject: 'Nouvelle réservation de rendez-vous', title: 'Nouveau rendez-vous réservé', client: 'Client', date: 'Date', time: 'Heure', service: 'Service', duration: 'Durée', min: 'min', price: 'Prix', contact: 'Contact du client', comment: 'Commentaire du client', status: 'Statut', pending: 'En attente de confirmation', confirmed: 'Confirmé', cta: 'Voir le rendez-vous' },
  ru: { subject: 'Новая запись на встречу', title: 'Новая запись на встречу', client: 'Клиент', date: 'Дата', time: 'Время', service: 'Услуга', duration: 'Длительность', min: 'мин', price: 'Цена', contact: 'Контакт клиента', comment: 'Комментарий клиента', status: 'Статус', pending: 'Ожидает подтверждения', confirmed: 'Подтверждено', cta: 'Открыть встречу' },
}
const pick = (l?: string): Lang => (l && l in L ? (l as Lang) : 'en')

interface Props {
  language?: string; clientName?: string; date?: string; time?: string; serviceName?: string
  duration?: number; price?: string; contact?: string; comment?: string; status?: string; url?: string
}

const Row = ({ k, v }: { k: string; v?: string }) =>
  v ? <Text style={{ margin: '6px 0', fontSize: 14, color: '#1f2937' }}><strong>{k}:</strong> {v}</Text> : null

const Email = (p: Props) => {
  const t = L[pick(p.language)]
  const confirmed = p.status === 'confirmed'
  return (
    <Html lang={pick(p.language)}>
      <Head />
      <Preview>{t.title} — {p.clientName ?? ''}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '20px 25px' }}>
          <Text style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
            <span style={{ color: '#1e293b' }}>Solo</span><span style={{ color: '#f97316' }}> .Bizz</span>
          </Text>
          <Heading style={{ fontSize: 22, margin: '0 0 12px', color: '#1e293b' }}>{t.title}</Heading>
          <Text style={{ display: 'inline-block', margin: '0 0 12px', padding: '4px 10px', borderRadius: 999, fontSize: 13, fontWeight: 700, backgroundColor: confirmed ? '#dcfce7' : '#ffedd5', color: confirmed ? '#166534' : '#9a3412' }}>
            {t.status}: {confirmed ? t.confirmed : t.pending}
          </Text>
          <Hr />
          <Section>
            <Row k={t.client} v={p.clientName} />
            <Row k={t.date} v={p.date} />
            <Row k={t.time} v={p.time} />
            <Row k={t.service} v={p.serviceName} />
            <Row k={t.duration} v={p.duration ? `${p.duration} ${t.min}` : undefined} />
            <Row k={t.price} v={p.price} />
            <Row k={t.contact} v={p.contact} />
            <Row k={t.comment} v={p.comment} />
          </Section>
          {p.url && (
            <Section style={{ margin: '20px 0' }}>
              <Button href={p.url} style={{ backgroundColor: '#f97316', color: '#ffffff', padding: '12px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>{t.cta}</Button>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `${L[pick(d.language)].subject} — ${[d.clientName, d.date, d.time?.split(/\s*[–-]\s*/)[0]].filter(Boolean).join(', ')}`,
  displayName: 'New booking (to specialist)',
  previewData: { language: 'uk', clientName: 'Олена Коваль', date: '20 листопада 2026', time: '10:00 – 10:50', serviceName: 'Індивідуальна консультація', duration: 50, price: '€60.00', contact: 'olena@example.com · +380000000000', comment: 'Перша зустріч', status: 'pending', url: 'https://solo-bizz.com/calendar' },
} satisfies TemplateEntry
