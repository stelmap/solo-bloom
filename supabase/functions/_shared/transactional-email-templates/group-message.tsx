/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

type Lang = 'uk' | 'en' | 'pl' | 'de' | 'fr' | 'ru'
type Kind = 'received' | 'confirmed' | 'rejected' | 'waitlisted' | 'message'
const norm = (v: unknown): Lang => (['uk', 'en', 'pl', 'de', 'fr', 'ru'].includes(String(v)) ? v : 'en') as Lang

const S: Record<Lang, Record<Exclude<Kind, 'message'>, [string, string]> & { hi: (n: string) => string; open: string; group: string }> = {
  uk: { hi: n => `Вітаємо, ${n}!`, open: 'Відкрити', group: 'Група',
    received: ['Заявку отримано', 'Ваша заявка надійшла. Терапевт розгляне її та повідомить про рішення.'],
    confirmed: ['Участь підтверджено', 'Вашу участь у групі підтверджено.'],
    rejected: ['Рішення щодо заявки', 'На жаль, цього разу участь у групі не підтверджено.'],
    waitlisted: ['Ви у списку очікування', 'Зараз місць немає. Ми повідомимо, якщо місце з’явиться.'] },
  en: { hi: n => `Hello, ${n}!`, open: 'Open', group: 'Group',
    received: ['Application received', 'Your application has arrived. The therapist will review it and let you know.'],
    confirmed: ['Participation confirmed', 'Your place in the group is confirmed.'],
    rejected: ['Application decision', 'Unfortunately your participation was not confirmed this time.'],
    waitlisted: ['You are on the waiting list', 'The group is full right now. We will let you know if a place opens.'] },
  pl: { hi: n => `Dzień dobry, ${n}!`, open: 'Otwórz', group: 'Grupa',
    received: ['Zgłoszenie otrzymane', 'Twoje zgłoszenie dotarło. Terapeuta je rozpatrzy i da znać.'],
    confirmed: ['Udział potwierdzony', 'Twoje miejsce w grupie zostało potwierdzone.'],
    rejected: ['Decyzja w sprawie zgłoszenia', 'Niestety tym razem udział nie został potwierdzony.'],
    waitlisted: ['Jesteś na liście oczekujących', 'Grupa jest pełna. Damy znać, gdy zwolni się miejsce.'] },
  de: { hi: n => `Hallo ${n}!`, open: 'Öffnen', group: 'Gruppe',
    received: ['Anmeldung erhalten', 'Ihre Anmeldung ist eingegangen. Die Therapeutin bzw. der Therapeut meldet sich.'],
    confirmed: ['Teilnahme bestätigt', 'Ihr Platz in der Gruppe ist bestätigt.'],
    rejected: ['Entscheidung zur Anmeldung', 'Leider wurde Ihre Teilnahme diesmal nicht bestätigt.'],
    waitlisted: ['Sie stehen auf der Warteliste', 'Die Gruppe ist voll. Wir melden uns, sobald ein Platz frei wird.'] },
  fr: { hi: n => `Bonjour ${n} !`, open: 'Ouvrir', group: 'Groupe',
    received: ['Demande reçue', 'Votre demande est arrivée. Le thérapeute l’examinera et vous répondra.'],
    confirmed: ['Participation confirmée', 'Votre place dans le groupe est confirmée.'],
    rejected: ['Décision sur la demande', 'Malheureusement, votre participation n’a pas été confirmée cette fois.'],
    waitlisted: ['Vous êtes sur liste d’attente', 'Le groupe est complet. Nous vous préviendrons si une place se libère.'] },
  ru: { hi: n => `Здравствуйте, ${n}!`, open: 'Открыть', group: 'Группа',
    received: ['Заявка получена', 'Ваша заявка поступила. Терапевт рассмотрит её и сообщит о решении.'],
    confirmed: ['Участие подтверждено', 'Ваше участие в группе подтверждено.'],
    rejected: ['Решение по заявке', 'К сожалению, в этот раз участие не подтверждено.'],
    waitlisted: ['Вы в списке ожидания', 'Сейчас мест нет. Мы сообщим, если место освободится.'] },
}

interface Props { kind?: Kind; language?: string; name?: string; groupName?: string; subject?: string; message?: string; link?: string; instructions?: string }
const pick = (p: Props) => {
  const s = S[norm(p.language)]
  if (p.kind === 'message' || !p.kind) return { title: p.subject || s.group, body: p.message || '' }
  const [title, body] = s[p.kind]; return { title, body }
}

const Email = (p: Props) => {
  const s = S[norm(p.language)]; const { title, body } = pick(p)
  return (
    <Html lang={norm(p.language)}><Head /><Preview>{title}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ padding: '24px', maxWidth: '560px' }}>
          <Text style={{ color: '#E8590C', fontWeight: 700, fontSize: '14px', margin: 0 }}>Solo .Bizz</Text>
          <Heading style={{ fontSize: '22px', color: '#1f2933' }}>{title}</Heading>
          {p.groupName && <Text style={{ color: '#52606d', margin: '0 0 12px' }}>{s.group}: {p.groupName}</Text>}
          {p.name && <Text style={{ color: '#1f2933' }}>{s.hi(p.name)}</Text>}
          <Text style={{ color: '#1f2933', whiteSpace: 'pre-line', lineHeight: '1.5' }}>{body}</Text>
          {p.kind === 'confirmed' && p.instructions && <Text style={{ color: '#1f2933', whiteSpace: 'pre-line', background: '#fff4ec', padding: '12px', borderRadius: '8px' }}>{p.instructions}</Text>}
          {p.link && <Button href={p.link} style={{ background: '#E8590C', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontWeight: 700 }}>{s.open}</Button>}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => { const { title } = pick(d as Props); return d.groupName ? `${title} — ${d.groupName}` : title },
  displayName: 'Group message',
  previewData: { kind: 'confirmed', language: 'uk', name: 'Олена', groupName: 'Група підтримки', instructions: 'Зустрічі онлайн, посилання надійде окремо.' },
} satisfies TemplateEntry
