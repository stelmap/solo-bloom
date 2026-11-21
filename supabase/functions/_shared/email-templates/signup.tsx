/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { SETUP_GUIDE_URL, SUPPORT_EMAIL, WEBSITE_URL, WELCOME_CONTENT, WELCOME_IMAGES, WELCOME_FEATURE_ICONS, WELCOME_VALUE_ICONS, WELCOME_THEME as theme, setupGuideUrl, welcomeLanguage } from './welcome-content.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  language?: string | null
  setupGuideUrl?: string
}

export const SignupEmail = ({
  confirmationUrl,
  language,
  setupGuideUrl: guideOverride,
}: SignupEmailProps) => {
  const lang = welcomeLanguage(language)
  const s = WELCOME_CONTENT[lang]
  const guide = setupGuideUrl(guideOverride ?? SETUP_GUIDE_URL)
  const logo = <Text style={{ margin: '0', fontSize: '24px', lineHeight: '30px', fontWeight: 800, color: theme.ink }}>Solo<span style={{ color: theme.orange }}> .Bizz</span></Text>
  const textStyle = { color: theme.text, fontSize: '14px', lineHeight: '21px', margin: '12px 0 0' }
  const titleStyle = { color: theme.ink, fontSize: '20px', lineHeight: '26px', margin: '0 0 14px', fontWeight: 700 }
  return (
    <Html lang={lang} dir="ltr">
      <Head><meta charSet="utf-8" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" /></Head>
      <Preview>{s.title}</Preview>
      <Body style={{ backgroundColor: theme.white, margin: 0, padding: '16px 8px', fontFamily: theme.font }}>
        <Container style={{ maxWidth: '640px', width: '100%', backgroundColor: theme.white, border: `1px solid ${theme.rule}`, borderRadius: '18px', overflow: 'hidden' }}>
          <Section style={{ padding: '18px 24px 14px', backgroundColor: theme.lavender }}>
            {logo}
            <div style={{ fontSize: 0, textAlign: 'left' }}>
              <div style={{ display: 'inline-block', width: '100%', maxWidth: '290px', verticalAlign: 'middle' }}>
                <Heading style={{ ...titleStyle, fontSize: '24px', lineHeight: '29px', margin: '12px 12px 0 0' }}>{s.title}</Heading>
                <Text style={{ ...textStyle, fontSize: '13px', lineHeight: '19px', margin: '8px 16px 0 0' }}>{s.intro}</Text>
              </div>
              <div style={{ display: 'inline-block', width: '100%', maxWidth: '290px', verticalAlign: 'middle', paddingTop: '12px' }}>
                <Img src={WELCOME_IMAGES[lang]} alt={s.imageAlt} width="290" style={{ width: '100%', maxWidth: '290px', height: 'auto', borderRadius: '10px', border: `1px solid ${theme.rule}` }} />
              </div>
            </div>
          </Section>
          <Section style={{ padding: '12px 24px 0' }}>
            <Section style={{ backgroundColor: theme.peach, borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
              <Text style={{ ...textStyle, fontSize: '13px', lineHeight: '19px', color: theme.ink, fontWeight: 600, margin: '0 0 10px' }}>{s.activation}</Text>
              <Button href={confirmationUrl} style={{ backgroundColor: theme.orange, color: theme.white, borderRadius: '10px', fontSize: '16px', fontWeight: 700, padding: '15px 24px', textDecoration: 'none' }}>{s.cta}</Button>
            </Section>
          </Section>
          <Section style={{ padding: '22px 24px 0' }}>
            <Heading as="h2" style={titleStyle}>{s.featuresTitle}</Heading>
            <div style={{ fontSize: 0, textAlign: 'center' }}>
              {s.features.map((label, index) => <div key={label} style={{ display: 'inline-block', verticalAlign: 'top', width: '96px', padding: '0 0 12px' }}>
                <Img src={WELCOME_FEATURE_ICONS[index]} alt="" width="44" height="44" style={{ width: '44px', height: '44px', borderRadius: '10px', margin: '0 auto 8px' }} />
                <Text style={{ color: theme.ink, fontSize: '12px', fontWeight: 600, lineHeight: '17px', margin: '0 5px' }}>{label}</Text>
              </div>)}
            </div>
          </Section>
          <Section style={{ padding: '14px 24px 10px' }}>
            <Heading as="h2" style={titleStyle}>{s.valueTitle}</Heading>
            <div style={{ fontSize: 0 }}>
              {s.values.map((value, index) => <div key={value.title} style={{ width: '100%', maxWidth: '192px', display: 'inline-block', verticalAlign: 'top', marginBottom: '14px' }}>
                <Img src={WELCOME_VALUE_ICONS[index]} alt="" width="36" height="36" style={{ width: '36px', height: '36px', borderRadius: '8px', margin: '0 0 8px' }} />
                <Heading as="h3" style={{ color: theme.ink, fontSize: '14px', lineHeight: '20px', margin: '0 12px 6px 0' }}>{value.title}</Heading>
                <Text style={{ ...textStyle, fontSize: '12px', lineHeight: '18px', margin: '0 14px 0 0' }}>{value.text}</Text>
              </div>)}
            </div>
          </Section>
          <Section style={{ padding: '0 24px 18px' }}>
            <Section style={{ backgroundColor: theme.lavender, borderRadius: '14px', padding: '16px' }}>
              <Heading as="h2" style={{ ...titleStyle, fontSize: '18px', lineHeight: '24px', marginBottom: '6px' }}>{s.setupTitle}</Heading>
              <Text style={{ ...textStyle, margin: guide ? '0 0 12px' : 0 }}>{s.setupText}</Text>
              {guide ? <Button href={guide} style={{ color: theme.purple, backgroundColor: theme.white, border: `1px solid ${theme.purple}`, borderRadius: '8px', padding: '11px 16px', fontSize: '13px', fontWeight: 600 }}>{s.setupCta}</Button> : null}
            </Section>
          </Section>
          <Section style={{ padding: '20px 24px', borderTop: `1px solid ${theme.rule}` }}>
            <Text style={{ ...textStyle, fontSize: '12px', lineHeight: '18px', margin: '0 0 16px' }}>{s.support}<br /><Link href={`mailto:${SUPPORT_EMAIL}`} style={{ color: theme.orange, textDecoration: 'underline' }}>{SUPPORT_EMAIL}</Link></Text>
            {logo}
            <Text style={{ ...textStyle, fontSize: '12px', margin: '8px 0 0' }}><Link href={WEBSITE_URL} style={{ color: theme.text }}>solo-bizz.com</Link></Text>
            <Text style={{ ...textStyle, color: theme.muted, fontSize: '11px', lineHeight: '17px' }}>{s.ignore}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail
