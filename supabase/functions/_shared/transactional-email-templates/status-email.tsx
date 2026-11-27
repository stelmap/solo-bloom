/// <reference types="npm:@types/react@18.3.1" />
/**
 * One light layout for every meeting-status email (pending, confirmed,
 * cancelled, declined). Each status supplies only its copy, icon, colour and
 * optional action; empty fields are never rendered and no private client data
 * (names, contacts, requests) is shown.
 */
import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import { WEBSITE_URL, SUPPORT_EMAIL } from '../email-templates/welcome-content.ts'

export type Lang = 'en' | 'fr' | 'pl' | 'uk' | 'ru' | 'de'
export type MeetingStatus = 'pending' | 'confirmed' | 'cancelled' | 'declined'

export function normalizeLang(value: unknown): Lang {
  const v = String(value || '').toLowerCase().slice(0, 2)
  return (['fr', 'pl', 'uk', 'ru', 'de'] as const).includes(v as any) ? (v as Lang) : 'en'
}

export function titleCaseName(name?: string) {
  if (!name) return name
  const t = name.trim()
  if (!t || /\p{Ll}/u.test(t)) return t
  return t.toLocaleLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_m, a, b) => a + b.toLocaleUpperCase())
}

/** Subject suffix "Name, 30 November, 09:00" without year, weekday or timezone. */
export function subjectWhen(data: Record<string, any>) {
  const name = titleCaseName(data?.specialistName || '') || ''
  const shortDate = (String(data?.sessionDate || '').split(',').find((p) => /\d/.test(p)) || '').replace(/\s*\d{4}\s*(р\.|г\.|r\.)?\s*$/u, '').trim()
  const time = String(data?.sessionTime || '').split(/[·–-]/)[0].trim()
  return [name, [shortDate, time].filter(Boolean).join(', ')].filter(Boolean).join(', ')
}

export function safeHttpsUrl(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password ? u.href : undefined } catch { return undefined }
}

const NAVY = '#15192F'
const ORANGE = '#FF6800'
const MUTED = '#646A78'
const RULE = '#E7E8EE'
const CARD = '#F6F7FB'
const A = `${WEBSITE_URL}/__l5e/assets-v1`
export const ICON = {
  pending: `${A}/2c0314b6-3296-4c7a-81a7-4222797e774b/req-hero-clock.png`,
  confirmed: `${A}/6dff78ce-eea3-4110-86bc-7b459c2b238f/st-confirmed.png`,
  cancelled: `${A}/d69e370d-5f65-4c79-9541-cbac2fb43f93/st-cancelled.png`,
  declined: `${A}/fbc3703a-0b13-4db0-a958-d217ca62d0f3/st-declined.png`,
  person: `${A}/7e07c2ac-4909-4495-8491-d765dc4539f8/req-person.png`,
  calendar: `${A}/f750adbc-a828-4123-b96f-ea9e8a679aef/req-calendar.png`,
  clock: `${A}/716d0b43-8386-4b91-90fd-0c8f07a50408/req-clock.png`,
  check: `${A}/547614c0-5bac-4f4e-abcc-4299c657b4cd/req-check.png`,
  stepClock: `${A}/b21500bd-8d04-47a3-9ea9-b7c1948a1d58/req-step-clock.png`,
  mail: `${A}/9f0de368-748a-4da7-93b4-b4f944f237bb/req-mail.png`,
}

export const FOOTER_TAGLINE: Record<Lang, string> = {
  uk: 'Простір для незалежних спеціалістів та їхніх клієнтів',
  en: 'A space for independent specialists and their clients',
  ru: 'Пространство для независимых специалистов и их клиентов',
  pl: 'Przestrzeń dla niezależnych specjalistów i ich klientów',
  fr: 'Un espace pour les spécialistes indépendants et leurs clients',
  de: 'Ein Ort für unabhängige Fachleute und ihre Klient:innen',
}

export interface DetailItem { icon: string; label: string; value?: string; strike?: boolean; href?: string }

export interface StatusEmailProps {
  lang: Lang
  status: MeetingStatus
  preview: string
  title: string
  intro: string
  details: DetailItem[]
  steps?: { icon: string; text: string }[]
  stepsTitle?: string
  note?: string
  cta?: { label: string; href?: string }
  closing?: string
}

export function StatusEmail({ lang, status, preview, title, intro, details, steps, stepsTitle, note, cta, closing }: StatusEmailProps) {
  const shown = details.filter((d) => d.value && d.value.trim())
  return (
    <Html lang={lang} dir="ltr">
      <Head><meta charSet="utf-8" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" /></Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#ffffff', margin: 0, padding: '16px 8px', fontFamily: FONT }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', border: `1px solid ${RULE}`, borderRadius: '14px', overflow: 'hidden' }}>
          <Section style={{ padding: '18px 24px', borderBottom: `1px solid ${RULE}`, textAlign: 'center' as const }}>
            <Heading style={wordmark}><span style={{ color: NAVY }}>Solo</span><span style={{ color: ORANGE }}>&nbsp;.Bizz</span></Heading>
          </Section>
          <Section style={{ padding: '24px 24px 4px', textAlign: 'center' as const }}>
            <Img src={ICON[status]} alt="" width="48" height="48" style={{ width: '48px', height: '48px', margin: '0 auto 12px' }} />
            <Heading style={{ color: NAVY, fontSize: '20px', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.3 }}>{title}</Heading>
            <Text style={{ color: MUTED, fontSize: '14px', lineHeight: 1.55, margin: 0 }}>{intro}</Text>
          </Section>
          <Section style={{ padding: '18px 24px 22px' }}>
            {shown.length ? (
              <Section style={{ backgroundColor: CARD, borderRadius: '10px', padding: '14px 16px' }}>
                {shown.map((d, i) => (
                  <React.Fragment key={i}>
                    {i === 1 && shown[0].icon === ICON.person ? <Hr style={{ borderColor: RULE, margin: '6px 0 12px' }} /> : null}
                    <Row style={{ margin: '6px 0' }}>
                      <Column style={{ width: '28px', verticalAlign: 'top', paddingTop: '2px' }}><Img src={d.icon} alt="" width="16" height="16" style={{ width: '16px', height: '16px' }} /></Column>
                      <Column style={{ verticalAlign: 'top' }}>
                        <Text style={{ fontSize: '12px', color: MUTED, margin: 0 }}>{d.label}</Text>
                        <Text style={{ fontSize: '14px', color: d.strike ? MUTED : NAVY, fontWeight: 700, margin: '2px 0 8px', textDecoration: d.strike ? 'line-through' : 'none', wordBreak: 'break-word' as const }}>
                          {d.href ? <Link href={d.href} style={{ color: ORANGE }}>{d.value}</Link> : d.value}
                        </Text>
                      </Column>
                    </Row>
                  </React.Fragment>
                ))}
              </Section>
            ) : null}
            {steps?.length ? (
              <>
                {stepsTitle ? <Text style={{ fontSize: '14px', fontWeight: 700, color: NAVY, margin: '20px 0 10px' }}>{stepsTitle}</Text> : null}
                {steps.map((s, i) => (
                  <Row key={i} style={{ margin: '0 0 8px' }}>
                    <Column style={{ width: '24px', verticalAlign: 'top', paddingTop: '2px' }}><Img src={s.icon} alt="" width="14" height="14" style={{ width: '14px', height: '14px' }} /></Column>
                    <Column style={{ verticalAlign: 'top' }}><Text style={{ fontSize: '13px', color: NAVY, margin: 0, lineHeight: 1.5 }}>{s.text}</Text></Column>
                  </Row>
                ))}
              </>
            ) : null}
            {note ? <Text style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6, margin: '18px 0 0', textAlign: 'center' as const }}>{note}</Text> : null}
            {cta?.href ? (
              <Section style={{ textAlign: 'center' as const, margin: '18px 0 0' }}>
                <Button href={cta.href} style={{ backgroundColor: ORANGE, color: '#ffffff', fontSize: '14px', fontWeight: 700, borderRadius: '10px', padding: '12px 22px', textDecoration: 'none' }}>{cta.label}</Button>
              </Section>
            ) : null}
            {closing ? <Text style={{ fontSize: '14px', color: NAVY, fontWeight: 600, margin: '18px 0 0', textAlign: 'center' as const }}>{closing}</Text> : null}
          </Section>
          <Section style={{ backgroundColor: CARD, borderTop: `1px solid ${RULE}`, padding: '16px 24px 18px', textAlign: 'center' as const }}>
            <Heading style={{ ...wordmark, fontSize: '14px' }}><span style={{ color: NAVY }}>Solo</span><span style={{ color: ORANGE }}> .Bizz</span></Heading>
            <Text style={{ fontSize: '12px', color: MUTED, margin: '6px 0 0', lineHeight: 1.6 }}>
              {FOOTER_TAGLINE[lang]}<br />
              <Link href={WEBSITE_URL} style={{ color: ORANGE, textDecoration: 'none' }}>solo-bizz.com</Link>
              {' · '}
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={{ color: ORANGE, textDecoration: 'none' }}>{SUPPORT_EMAIL}</Link><br />
              © {new Date().getUTCFullYear()} Solo .Bizz
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const wordmark = { fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: 0 }

/** "09:00 · Europe/Warsaw" — omits the zone when unknown. */
export function timeWithZone(time?: string, tz?: string) {
  return [time, tz].filter((v) => v && String(v).trim()).join(' · ')
}
