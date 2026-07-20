/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Solo.Bizz'

type Lang = 'en' | 'fr' | 'pl' | 'uk' | 'ru'
function normalizeLang(v: unknown): Lang {
  const s = String(v || '').toLowerCase().slice(0, 2)
  if (s === 'fr' || s === 'pl' || s === 'uk' || s === 'ru') return s
  return 'en'
}

const STRINGS: Record<Lang, {
  preview: string; subject: string; label: string;
  greeting: (n: string) => string;
  intro: (s: string) => React.ReactNode;
  cta: string; outro: string; fallback: string; footer: string; htmlLang: string;
}> = {
  en: {
    preview: 'Please review and sign your information agreement',
    subject: 'Information agreement to sign',
    label: 'AGREEMENT TO SIGN',
    greeting: (n) => `Hello, ${n} 👋`,
    intro: (s) => <>{s} has prepared an information agreement for you to review and sign. It only takes a couple of minutes.</>,
    cta: 'Open agreement',
    outro: 'For your security, a one-time code will be sent to this email address when you open the link.',
    fallback: 'If the button does not work, copy and paste this link into your browser:',
    footer: `You received this email because you have a professional relationship with a ${SITE_NAME} practitioner.`,
    htmlLang: 'en',
  },
  fr: {
    preview: 'Merci de consulter et signer votre document d’information',
    subject: 'Document d’information à signer',
    label: 'DOCUMENT À SIGNER',
    greeting: (n) => `Bonjour, ${n} 👋`,
    intro: (s) => <>{s} a préparé un document d’information à consulter et à signer. Cela ne prend que quelques minutes.</>,
    cta: 'Ouvrir le document',
    outro: 'Pour votre sécurité, un code à usage unique sera envoyé à cette adresse lorsque vous ouvrirez le lien.',
    fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
    footer: `Vous recevez cet email car vous êtes en relation professionnelle avec un praticien ${SITE_NAME}.`,
    htmlLang: 'fr',
  },
  pl: {
    preview: 'Prosimy o zapoznanie się i podpisanie zgody informacyjnej',
    subject: 'Zgoda informacyjna do podpisu',
    label: 'DOKUMENT DO PODPISU',
    greeting: (n) => `Cześć, ${n} 👋`,
    intro: (s) => <>{s} przygotował(a) dla Ciebie zgodę informacyjną do zapoznania i podpisu. Zajmie to tylko chwilę.</>,
    cta: 'Otwórz dokument',
    outro: 'Dla bezpieczeństwa jednorazowy kod zostanie wysłany na ten adres po otwarciu linku.',
    fallback: 'Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:',
    footer: `Otrzymujesz tę wiadomość, ponieważ jesteś w relacji zawodowej ze specjalistą ${SITE_NAME}.`,
    htmlLang: 'pl',
  },
  uk: {
    preview: 'Будь ласка, перегляньте та підпишіть інформаційну угоду',
    subject: 'Інформаційна угода до підпису',
    label: 'ДОКУМЕНТ ДО ПІДПИСУ',
    greeting: (n) => `Вітаємо, ${n} 👋`,
    intro: (s) => <>{s} підготував(ла) для вас інформаційну угоду для ознайомлення та підпису. Це займе кілька хвилин.</>,
    cta: 'Відкрити документ',
    outro: 'Для вашої безпеки після відкриття посилання на цю адресу надійде одноразовий код.',
    fallback: 'Якщо кнопка не працює, скопіюйте це посилання у браузер:',
    footer: `Ви отримали цей лист, оскільки маєте професійні стосунки зі спеціалістом ${SITE_NAME}.`,
    htmlLang: 'uk',
  },
  ru: {
    preview: 'Пожалуйста, ознакомьтесь и подпишите информационное согласие',
    subject: 'Информационное согласие к подписанию',
    label: 'ДОКУМЕНТ ДЛЯ ПОДПИСИ',
    greeting: (n) => `Здравствуйте, ${n} 👋`,
    intro: (s) => <>{s} подготовил(а) для вас информационное согласие для ознакомления и подписи. Это займёт пару минут.</>,
    cta: 'Открыть документ',
    outro: 'Для безопасности на этот адрес будет отправлен одноразовый код после открытия ссылки.',
    fallback: 'Если кнопка не работает, скопируйте эту ссылку в браузер:',
    footer: `Вы получили это письмо, потому что состоите в профессиональных отношениях со специалистом ${SITE_NAME}.`,
    htmlLang: 'ru',
  },
}

interface Props {
  clientName?: string
  specialistName?: string
  agreementUrl?: string
  language?: string
}

const AgreementInvitationEmail = ({
  clientName = 'Client',
  specialistName = 'Your specialist',
  agreementUrl = '#',
  language,
}: Props) => {
  const T = STRINGS[normalizeLang(language)]
  return (
    <Html lang={T.htmlLang} dir="ltr">
      <Head />
      <Preview>{T.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Solo<span style={logoDot}>.Bizz</span></Text>
            <Text style={headerLabel}>{T.label}</Text>
          </Section>
          <Section style={bodySection}>
            <Heading style={h1}>{T.greeting(clientName)}</Heading>
            <Text style={lead}>{T.intro(specialistName)}</Text>
            <Section style={{ textAlign: 'center', margin: '24px 0 20px' }}>
              <Button href={agreementUrl} style={ctaBtn}>{T.cta}</Button>
            </Section>
            <Text style={outroText}>{T.outro}</Text>
            <Text style={fallbackLabel}>{T.fallback}</Text>
            <Text style={fallbackLink}>{agreementUrl}</Text>
          </Section>
          <Section style={footerSection}>
            <Text style={footerBrand}>Solo<span style={logoDot}>.Bizz</span></Text>
            <Text style={footerText}>{T.footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AgreementInvitationEmail,
  subject: (data: Record<string, any>) => STRINGS[normalizeLang(data?.language)].subject,
  displayName: 'Agreement invitation',
  previewData: {
    clientName: 'Jane',
    specialistName: 'Dr. Anna Kovalenko',
    agreementUrl: 'https://solo-bizz.lovable.app/a/example-token',
    language: 'en',
  },
} satisfies TemplateEntry

const FONT_STACK = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const SERIF_STACK = "'Instrument Serif', 'DM Serif Display', 'Times New Roman', Georgia, serif"

const main = { backgroundColor: '#ffffff', fontFamily: FONT_STACK, margin: 0, padding: '24px 12px' }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f0eee9', fontFamily: FONT_STACK }
const header = { backgroundColor: '#11122b', padding: '28px 28px 26px', color: '#ffffff', fontFamily: FONT_STACK }
const logo = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: 0, fontFamily: FONT_STACK }
const logoDot = { color: '#FF9900' }
const headerLabel = { fontSize: '11px', color: '#8a8ca6', fontWeight: 'bold' as const, letterSpacing: '0.18em', margin: '22px 0 0', fontFamily: FONT_STACK }
const bodySection = { padding: '28px 28px 8px', fontFamily: FONT_STACK }
const h1 = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.15, fontFamily: SERIF_STACK }
const lead = { fontSize: '15px', color: '#5b6076', lineHeight: 1.6, margin: '0 0 12px', fontFamily: FONT_STACK }
const ctaBtn = { backgroundColor: '#11122b', color: '#ffffff', padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 'bold' as const, textDecoration: 'none', fontFamily: FONT_STACK, display: 'inline-block' }
const outroText = { fontSize: '13px', color: '#5b6076', lineHeight: 1.6, margin: '8px 0 20px', fontFamily: FONT_STACK }
const fallbackLabel = { fontSize: '12px', color: '#8a8ca6', margin: '0 0 4px', fontFamily: FONT_STACK }
const fallbackLink = { fontSize: '12px', color: '#0f172a', margin: 0, wordBreak: 'break-all' as const, fontFamily: FONT_STACK }
const footerSection = { padding: '24px 28px 28px', borderTop: '1px solid #f0eee9', textAlign: 'center' as const, fontFamily: FONT_STACK }
const footerBrand = { fontSize: '14px', color: '#0f172a', fontWeight: 'bold' as const, margin: '0 0 8px', fontFamily: FONT_STACK }
const footerText = { fontSize: '12px', color: '#8a8ca6', margin: 0, lineHeight: 1.6, fontFamily: FONT_STACK }
