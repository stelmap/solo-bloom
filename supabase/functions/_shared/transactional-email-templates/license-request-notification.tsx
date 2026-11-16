/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { email?: string; message?: string; createdAt?: string }

const Email = ({ email, message, createdAt }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Discounted license request — {email ?? ''}</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 0' }}>
      <Container style={{ maxWidth: 560, margin: '0 auto', padding: '20px 25px' }}>
        <Heading style={{ fontSize: 20, color: '#1e293b' }}>New discounted license request</Heading>
        <Text style={{ color: '#475569' }}>A user without an active license asked for a discounted Solo .Bizz license. Nothing was activated automatically; assign a license after review.</Text>
        <Hr />
        <Text><strong>Email:</strong> {email}</Text>
        {createdAt && <Text><strong>Sent:</strong> {new Date(createdAt).toUTCString()}</Text>}
        {message && <Text style={{ whiteSpace: 'pre-wrap' }}><strong>Message:</strong><br />{message}</Text>}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Discounted license request — ${d.email ?? ''}`,
  to: 'info@solo-bizz.com',
  displayName: 'Discounted license request (admin)',
  previewData: { email: 'user@example.com', message: 'I am a returning user.', createdAt: new Date().toISOString() },
} satisfies TemplateEntry
