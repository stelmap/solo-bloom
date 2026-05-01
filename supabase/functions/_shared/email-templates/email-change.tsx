/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { getStrings, type Lang } from './i18n.ts'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
  lang?: Lang | string
}

export const EmailChangeEmail = ({ email, newEmail, confirmationUrl, lang }: EmailChangeEmailProps) => {
  const s = getStrings(lang).emailChange
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
        <Text style={text}>
          {s.body(email, newEmail)}
        </Text>
        <Text style={text}>{s.confirmIntro}</Text>
        <Button style={button} href={confirmationUrl}>{s.cta}</Button>
        <Text style={footer}>{s.warning}</Text>
      </Container>
    </Body>
  </Html>
  )
}

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const logoSection = { marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const logoDot = { color: '#FF9900' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#FF9900', textDecoration: 'underline' }
const button = { backgroundColor: '#FF9900', color: '#0f172a', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }
