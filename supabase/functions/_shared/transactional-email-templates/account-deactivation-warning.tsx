/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
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
  greeting: string; p1: string; p2: string; p3: string; cta: string; p4: string; sign: string;
}> = {
  en: {
    htmlLang: 'en',
    preview: 'Your SoloBizz account is scheduled for deletion',
    subject: 'Your SoloBizz account is scheduled for deletion',
    heading: 'Your account is scheduled for deletion',
    greeting: 'Hello,',
    p1: "We noticed that you haven't been using your SoloBizz account recently. To keep our platform secure and up to date, your account has been scheduled for deletion.",
    p2: 'Your account will be permanently deleted in 7 days unless you log in.',
    p3: 'Simply sign in during the next seven days and the deletion process will automatically be cancelled.',
    cta: 'Login to SoloBizz',
    p4: 'If you no longer plan to use SoloBizz, no action is required.',
    sign: 'Thank you,\nThe SoloBizz Team',
  },
  uk: {
    htmlLang: 'uk',
    preview: 'Ваш акаунт SoloBizz заплановано до видалення',
    subject: 'Ваш акаунт SoloBizz заплановано до видалення',
    heading: 'Ваш акаунт заплановано до видалення',
    greeting: 'Вітаємо!',
    p1: 'Ми помітили, що останнім часом ви не користуєтеся своїм акаунтом SoloBizz.',
    p2: 'Ваш акаунт буде остаточно видалено через 7 днів, якщо ви не увійдете до системи.',
    p3: 'Щоб зберегти акаунт, достатньо просто увійти до SoloBizz протягом наступних 7 днів. Після входу процес видалення буде автоматично скасовано.',
    cta: 'Увійти до SoloBizz',
    p4: 'Якщо ви більше не плануєте користуватися SoloBizz, нічого робити не потрібно.',
    sign: 'З повагою,\nКоманда SoloBizz',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Ваш аккаунт SoloBizz запланирован к удалению',
    subject: 'Ваш аккаунт SoloBizz запланирован к удалению',
    heading: 'Ваш аккаунт запланирован к удалению',
    greeting: 'Здравствуйте!',
    p1: 'Мы заметили, что в последнее время вы не пользуетесь своим аккаунтом SoloBizz.',
    p2: 'Ваш аккаунт будет окончательно удалён через 7 дней, если вы не войдёте в систему.',
    p3: 'Чтобы сохранить аккаунт, достаточно войти в SoloBizz в течение ближайших 7 дней — процесс удаления будет автоматически отменён.',
    cta: 'Войти в SoloBizz',
    p4: 'Если вы больше не планируете пользоваться SoloBizz, ничего делать не нужно.',
    sign: 'С уважением,\nКоманда SoloBizz',
  },
  pl: {
    htmlLang: 'pl',
    preview: 'Twoje konto SoloBizz zostało zaplanowane do usunięcia',
    subject: 'Twoje konto SoloBizz zostało zaplanowane do usunięcia',
    heading: 'Twoje konto zostało zaplanowane do usunięcia',
    greeting: 'Cześć,',
    p1: 'Zauważyliśmy, że ostatnio nie korzystasz ze swojego konta SoloBizz.',
    p2: 'Twoje konto zostanie trwale usunięte za 7 dni, jeśli się nie zalogujesz.',
    p3: 'Aby zachować konto, wystarczy zalogować się do SoloBizz w ciągu najbliższych 7 dni — proces usuwania zostanie automatycznie anulowany.',
    cta: 'Zaloguj się do SoloBizz',
    p4: 'Jeśli nie planujesz już korzystać z SoloBizz, nie musisz nic robić.',
    sign: 'Dziękujemy,\nZespół SoloBizz',
  },
  fr: {
    htmlLang: 'fr',
    preview: 'Votre compte SoloBizz est programmé pour suppression',
    subject: 'Votre compte SoloBizz est programmé pour suppression',
    heading: 'Votre compte est programmé pour suppression',
    greeting: 'Bonjour,',
    p1: "Nous avons remarqué que vous n'avez pas utilisé votre compte SoloBizz récemment.",
    p2: 'Votre compte sera définitivement supprimé dans 7 jours si vous ne vous connectez pas.',
    p3: 'Pour conserver votre compte, il suffit de vous connecter à SoloBizz au cours des 7 prochains jours — la suppression sera automatiquement annulée.',
    cta: 'Se connecter à SoloBizz',
    p4: "Si vous ne souhaitez plus utiliser SoloBizz, aucune action n'est nécessaire.",
    sign: 'Merci,\nL’équipe SoloBizz',
  },
}

interface Props { language?: string; loginUrl?: string }

const Email = ({ language, loginUrl = 'https://solo-bizz.com/auth' }: Props) => {
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
            <Text style={warn}>{T.p2}</Text>
            <Text style={p}>{T.p3}</Text>
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={loginUrl} style={btn}>{T.cta}</Button>
            </Section>
            <Text style={pMuted}>{T.p4}</Text>
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
  displayName: 'Account deactivation warning',
  previewData: { language: 'en', loginUrl: 'https://solo-bizz.com/auth' },
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
const pMuted = { fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: '20px 0 0' }
const warn = { fontSize: '15px', color: '#991b1b', backgroundColor: '#fef2f2', padding: '12px 14px', borderRadius: 10, borderLeft: '3px solid #dc2626', margin: '0 0 14px', lineHeight: 1.5 }
const btn = { backgroundColor: '#FF9900', color: '#11122b', fontWeight: 'bold' as const, padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontSize: '15px' }
const sign = { fontSize: '14px', color: '#334155', margin: '24px 0 0', whiteSpace: 'pre-line' as const }
