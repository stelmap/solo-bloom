/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Solo Bizz'

interface BookingData {
  name: string
  email: string
  phone?: string
  message?: string
  language?: string
  source?: string
  created_at?: string
}

const Email: React.FC<BookingData> = ({ name, email, phone, message, language, source, created_at }) => (
  <Html lang="uk">
    <Head />
    <Preview>Нова заявка з лендингу — {name}</Preview>
    <Body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f6f6f6', margin: 0, padding: '24px 0' }}>
      <Container style={{ backgroundColor: '#ffffff', maxWidth: 560, margin: '0 auto', padding: 24, borderRadius: 8 }}>
        <Heading style={{ fontSize: 20, margin: '0 0 8px' }}>Нова заявка з {SITE_NAME}</Heading>
        <Text style={{ color: '#666', margin: '0 0 16px' }}>Хтось залишив заявку на коротку розмову.</Text>
        <Hr />
        <Section>
          <Text style={{ margin: '8px 0' }}><strong>Ім'я:</strong> {name}</Text>
          <Text style={{ margin: '8px 0' }}><strong>Email:</strong> <a href={`mailto:${email}`}>{email}</a></Text>
          {phone && <Text style={{ margin: '8px 0' }}><strong>Телефон:</strong> <a href={`tel:${phone}`}>{phone}</a></Text>}
          {language && <Text style={{ margin: '8px 0' }}><strong>Мова:</strong> {language.toUpperCase()}</Text>}
          {source && <Text style={{ margin: '8px 0' }}><strong>Джерело:</strong> {source}</Text>}
          {created_at && <Text style={{ margin: '8px 0' }}><strong>Дата:</strong> {new Date(created_at).toLocaleString('uk-UA')}</Text>}
        </Section>
        {message && (
          <>
            <Hr />
            <Text style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}><strong>Повідомлення:</strong><br />{message}</Text>
          </>
        )}
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: Email,
  subject: (data) => `Нова заявка з лендингу — ${data.name || ''}`.trim(),
  to: 'info@solo-bizz.com',
  displayName: 'Booking request notification',
  previewData: {
    name: 'Олена',
    email: 'olena@example.com',
    phone: '+380000000000',
    message: 'Цікавить демо для приватної практики.',
    language: 'uk',
    source: '/#final',
    created_at: new Date().toISOString(),
  },
}
