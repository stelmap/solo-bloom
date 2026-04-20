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

interface RecoveryEmailProps {
  siteName: string
  token?: string
  confirmationUrl?: string
}

export const RecoveryEmail = ({ token }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Solo.Biz password reset code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logo}>Solo<span style={logoDot}>.Biz</span></Text>
        </Section>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password. Enter the 6-digit code below in the app to continue.
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={helper}>
          This code is single-use and expires shortly. If you didn't request a password reset, you can safely ignore this email — your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const logoSection = { marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const logoDot = { color: '#FF9900' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = { fontFamily: "'DM Sans', Courier, monospace", fontSize: '32px', fontWeight: 'bold' as const, color: '#FF9900', letterSpacing: '6px', margin: '0 0 30px', textAlign: 'center' as const }
const helper = { fontSize: '13px', color: '#9ca3af', lineHeight: '1.6', margin: '24px 0 0' }
