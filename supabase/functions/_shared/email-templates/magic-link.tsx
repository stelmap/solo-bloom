/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for Solo.Biz</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logo}>Solo<span style={logoDot}>.Biz</span></Text>
        </Section>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>Click the button below to log in to Solo.Biz. This link will expire shortly.</Text>
        <Button style={button} href={confirmationUrl}>Log In</Button>
        <Text style={footer}>If you didn't request this link, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const logoSection = { marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const logoDot = { color: '#FF9900' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#FF9900', color: '#0f172a', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }
