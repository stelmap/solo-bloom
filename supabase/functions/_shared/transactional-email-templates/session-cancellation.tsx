/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Solo.Biz"

interface SessionCancellationProps {
  clientName?: string
  sessionDate?: string
  sessionTime?: string
  cancellationReason?: string
}

const SessionCancellationEmail = ({
  clientName = 'Client',
  sessionDate = '',
  sessionTime = '',
  cancellationReason = 'The specialist marked this time as unavailable.',
}: SessionCancellationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your session has been cancelled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logo}>Solo<span style={logoDot}>.Biz</span></Text>
        </Section>
        <Heading style={h1}>Session Cancelled</Heading>
        <Text style={text}>
          Hi {clientName},
        </Text>
        <Text style={text}>
          We're sorry to inform you that your upcoming session has been cancelled.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>📅 Date</Text>
          <Text style={detailValue}>{sessionDate}</Text>
          <Text style={detailLabel}>🕐 Time</Text>
          <Text style={detailValue}>{sessionTime}</Text>
        </Section>
        <Section style={reasonBox}>
          <Text style={reasonLabel}>Reason</Text>
          <Text style={reasonText}>{cancellationReason}</Text>
        </Section>
        <Text style={text}>
          Please contact your specialist to reschedule at a convenient time.
        </Text>
        <Text style={footer}>
          — The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SessionCancellationEmail,
  subject: 'Your session has been cancelled',
  displayName: 'Session cancellation',
  previewData: {
    clientName: 'Jane Doe',
    sessionDate: 'April 10, 2026',
    sessionTime: '10:00 AM',
    cancellationReason: 'The specialist marked this time as unavailable.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const logoSection = { marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const logoDot = { color: '#FF9900' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#dc2626', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px 24px', margin: '0 0 8px' }
const detailLabel = { fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, margin: '0 0 4px', letterSpacing: '0.05em' }
const detailValue = { fontSize: '16px', color: '#0f172a', fontWeight: '600' as const, margin: '0 0 16px' }
const reasonBox = { backgroundColor: '#fef2f2', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #dc2626' }
const reasonLabel = { fontSize: '12px', color: '#dc2626', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, margin: '0 0 4px' }
const reasonText = { fontSize: '14px', color: '#991b1b', margin: '0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
