/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Solo .Bizz'

interface ReviewData {
  display_name?: string
  email?: string
  profession?: string
  plan?: string
  rating?: number
  body?: string
  verification_status?: string
  records_count?: number
  language?: string
  created_at?: string
}

const Email: React.FC<ReviewData> = ({
  display_name, email, profession, plan, rating, body, verification_status, records_count, language, created_at,
}) => (
  <Html lang="uk">
    <Head />
    <Preview>Новий відгук на модерації — {display_name || ''}</Preview>
    <Body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#ffffff', margin: 0, padding: '24px 0' }}>
      <Container style={{ backgroundColor: '#ffffff', maxWidth: 560, margin: '0 auto', padding: 24, borderRadius: 8, border: '1px solid #eee' }}>
        <Heading style={{ fontSize: 20, margin: '0 0 8px' }}>Новий відгук про {SITE_NAME}</Heading>
        <Text style={{ color: '#666', margin: '0 0 16px' }}>Відгук очікує ручної модерації.</Text>
        <Hr />
        <Section>
          <Text style={{ margin: '8px 0' }}><strong>Ім'я:</strong> {display_name}</Text>
          <Text style={{ margin: '8px 0' }}><strong>Email:</strong> {email}</Text>
          <Text style={{ margin: '8px 0' }}><strong>Професія:</strong> {profession}</Text>
          {plan && <Text style={{ margin: '8px 0' }}><strong>Тариф:</strong> {plan}</Text>}
          <Text style={{ margin: '8px 0' }}><strong>Оцінка:</strong> {rating}/5</Text>
          <Text style={{ margin: '8px 0' }}><strong>Перевірка:</strong> {verification_status} ({records_count ?? 0} записів)</Text>
          {language && <Text style={{ margin: '8px 0' }}><strong>Мова:</strong> {language.toUpperCase()}</Text>}
          {created_at && <Text style={{ margin: '8px 0' }}><strong>Дата:</strong> {new Date(created_at).toLocaleString('uk-UA')}</Text>}
        </Section>
        <Hr />
        <Text style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{body}</Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: Email,
  subject: (data) => `Новий відгук на модерації — ${data.display_name || ''}`.trim(),
  to: 'info@solo-bizz.com',
  displayName: 'Review — admin notification',
  previewData: {
    display_name: 'Олена Л.',
    email: 'olena@example.com',
    profession: 'Психолог',
    plan: 'Solo Practice',
    rating: 5,
    body: 'Solo .Bizz допомагає мені тримати всю практику в одному місці.',
    verification_status: 'verified',
    records_count: 42,
    language: 'uk',
    created_at: new Date().toISOString(),
  },
}
