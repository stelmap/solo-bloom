/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { getStrings, type Lang } from './i18n.ts'

interface ReauthenticationEmailProps {
  token: string
  lang?: Lang | string
}

export const ReauthenticationEmail = ({ token, lang }: ReauthenticationEmailProps) => {
  const s = getStrings(lang).reauthentication
  return (
  <Html lang={lang || 'en'} dir="ltr">
    <Head />
    <Preview>{s.preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logo}>Solo<span style={logoDot}>.Biz</span></Text>
        </Section>
        <Heading style={h1}>{s.heading}</Heading>
        <Text style={text}>{s.intro}</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>{s.footer}</Text>
      </Container>
    </Body>
  </Html>
  )
}

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const logoSection = { marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const logoDot = { color: '#FF9900' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = { fontFamily: "'DM Sans', Courier, monospace", fontSize: '28px', fontWeight: 'bold' as const, color: '#FF9900', letterSpacing: '4px', margin: '0 0 30px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }
