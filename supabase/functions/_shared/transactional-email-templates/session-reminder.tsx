/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Solo.Biz"

interface SessionReminderProps {
  clientName?: string
  specialistName?: string
  sessionDate?: string
  sessionTime?: string
  confirmationUrl?: string
}

const SessionReminderEmail = ({
  clientName = 'Client',
  specialistName = 'your specialist',
  sessionDate = '',
  sessionTime = '',
  confirmationUrl,
}: SessionReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reminder: Your session is tomorrow</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logo}>Solo<span style={logoDot}>.Biz</span></Text>
        </Section>
        <Heading style={h1}>Session Reminder 📅</Heading>
        <Text style={text}>
          Hi {clientName},
        </Text>
        <Text style={text}>
          This is a friendly reminder about your upcoming consultation session
          with <strong>{specialistName}</strong>.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>📅 Date</Text>
          <Text style={detailValue}>{sessionDate}</Text>
          <Text style={detailLabel}>🕐 Time</Text>
          <Text style={detailValue}>{sessionTime}</Text>
        </Section>
        {confirmationUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button style={button} href={confirmationUrl}>
              Confirm Session
            </Button>
          </Section>
        )}
        <Text style={footer}>
          If you need to reschedule, please contact your specialist directly.
        </Text>
        <Text style={footer}>
          — The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SessionReminderEmail,
  subject: 'Reminder: Your session is tomorrow',
  displayName: 'Session reminder',
  previewData: {
    clientName: 'Jane Doe',
    specialistName: 'Dr. Smith',
    sessionDate: 'April 10, 2026',
    sessionTime: '10:00 AM',
    confirmationUrl: 'https://example.com/confirm-session?token=abc123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const logoSection = { marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const logoDot = { color: '#FF9900' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px 24px', margin: '0 0 8px' }
const detailLabel = { fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, margin: '0 0 4px', letterSpacing: '0.05em' }
const detailValue = { fontSize: '16px', color: '#0f172a', fontWeight: '600' as const, margin: '0 0 16px' }
const button = { backgroundColor: '#FF9900', color: '#0f172a', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
