/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

type Lang = 'en' | 'uk' | 'ru' | 'pl' | 'fr'
const SUPPORTED: Lang[] = ['en', 'uk', 'ru', 'pl', 'fr']
function normalizeLang(v: unknown): Lang {
  const s = String(v || '').toLowerCase().slice(0, 2) as Lang
  return SUPPORTED.includes(s) ? s : 'en'
}

const STRINGS: Record<Lang, {
  htmlLang: string; preview: string; subject: string; heading: string;
  greeting: string; p1: string; p2: string; sign: string;
}> = {
  en: {
    htmlLang: 'en',
    preview: 'Your SoloBizz account has been deleted',
    subject: 'Your SoloBizz account has been deleted',
    heading: 'Your account has been deleted',
    greeting: 'Hello,',
    p1: 'Your SoloBizz account has been permanently deleted because no activity was detected during the 7-day notification period.',
    p2: "If you'd like to use SoloBizz again, simply create a new account.",
    sign: 'Thank you,\nThe SoloBizz Team',
  },
  uk: {
    htmlLang: 'uk',
    preview: 'Ваш акаунт SoloBizz було видалено',
    subject: 'Ваш акаунт SoloBizz було видалено',
    heading: 'Ваш акаунт було видалено',
    greeting: 'Вітаємо!',
    p1: 'Оскільки ви не увійшли до SoloBizz протягом 7 днів після отримання попередження, ваш акаунт було остаточно видалено.',
    p2: 'Якщо в майбутньому ви захочете знову користуватися SoloBizz, ви можете створити новий акаунт у будь-який час.',
    sign: 'Дякуємо, що користувалися SoloBizz.\nКоманда SoloBizz',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Ваш аккаунт SoloBizz был удалён',
    subject: 'Ваш аккаунт SoloBizz был удалён',
    heading: 'Ваш аккаунт был удалён',
    greeting: 'Здравствуйте!',
    p1: 'Поскольку в течение 7 дней после уведомления вы не вошли в SoloBizz, ваш аккаунт был окончательно удалён.',
    p2: 'Если в будущем вы захотите снова пользоваться SoloBizz, вы можете создать новый аккаунт в любое время.',
    sign: 'Спасибо, что пользовались SoloBizz.\nКоманда SoloBizz',
  },
  pl: {
    htmlLang: 'pl',
    preview: 'Twoje konto SoloBizz zostało usunięte',
    subject: 'Twoje konto SoloBizz zostało usunięte',
    heading: 'Twoje konto zostało usunięte',
    greeting: 'Cześć,',
    p1: 'Ponieważ nie zalogowałeś się do SoloBizz w ciągu 7 dni od powiadomienia, Twoje konto zostało trwale usunięte.',
    p2: 'Jeśli w przyszłości zechcesz ponownie korzystać z SoloBizz, możesz w każdej chwili utworzyć nowe konto.',
    sign: 'Dziękujemy za korzystanie z SoloBizz.\nZespół SoloBizz',
  },
  fr: {
    htmlLang: 'fr',
    preview: 'Votre compte SoloBizz a été supprimé',
    subject: 'Votre compte SoloBizz a été supprimé',
    heading: 'Votre compte a été supprimé',
    greeting: 'Bonjour,',
    p1: "Étant donné que vous ne vous êtes pas connecté à SoloBizz dans les 7 jours suivant l'avertissement, votre compte a été définitivement supprimé.",
    p2: "Si vous souhaitez utiliser SoloBizz à nouveau, vous pouvez créer un nouveau compte à tout moment.",
    sign: "Merci d'avoir utilisé SoloBizz.\nL’équipe SoloBizz",
  },
}

interface Props { language?: string }

const Email = ({ language }: Props) => {
  const T = STRINGS[normalizeLang(language)]
  return (
    <Html lang={T.htmlLang} dir="ltr">
      <Head />
      <Preview>{T.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Solo<span style={logoDot}>.Bizz</span></Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>{T.heading}</Heading>
            <Text style={p}>{T.greeting}</Text>
            <Text style={p}>{T.p1}</Text>
            <Text style={p}>{T.p2}</Text>
            <Text style={sign}>{T.sign}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => STRINGS[normalizeLang(d?.language)].subject,
  displayName: 'Account deleted (final)',
  previewData: { language: 'en' },
} satisfies TemplateEntry

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const main = { backgroundColor: '#ffffff', fontFamily: FONT, margin: 0, padding: '24px 12px' }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #f0eee9', overflow: 'hidden' }
const header = { backgroundColor: '#11122b', padding: '24px 28px', color: '#ffffff' }
const logo = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: 0 }
const logoDot = { color: '#FF9900' }
const body = { padding: '28px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px', lineHeight: 1.2 }
const p = { fontSize: '15px', color: '#334155', lineHeight: 1.6, margin: '0 0 14px', whiteSpace: 'pre-line' as const }
const sign = { fontSize: '14px', color: '#334155', margin: '24px 0 0', whiteSpace: 'pre-line' as const }
