/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

type Lang = 'en' | 'uk'
function normalizeLang(v: unknown): Lang {
  return String(v || '').toLowerCase().slice(0, 2) === 'uk' ? 'uk' : 'en'
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
