/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Solo .Bizz'

type Kind = 'received' | 'approved' | 'rejected'

interface ReviewStatusData {
  display_name?: string
  kind?: Kind
  message?: string
}

const COPY: Record<Kind, { title: string; text: string }> = {
  received: {
    title: 'Дякуємо за ваш відгук',
    text: 'Ми отримали ваш відгук про Solo .Bizz. Перед публікацією він проходить перевірку — ми повідомимо вас, коли він з’явиться на сайті.',
  },
  approved: {
    title: 'Ваш відгук опубліковано',
    text: 'Ваш відгук про Solo .Bizz пройшов перевірку і вже опублікований на сайті. Дякуємо, що ділитеся своїм досвідом з іншими фахівцями.',
  },
  rejected: {
    title: 'Ваш відгук не було опубліковано',
    text: 'Дякуємо за ваш відгук про Solo .Bizz. Цього разу ми не змогли його опублікувати.',
  },
}

const Email: React.FC<ReviewStatusData> = ({ display_name, kind = 'received', message }) => {
  const copy = COPY[kind] ?? COPY.received
  return (
    <Html lang="uk">
      <Head />
      <Preview>{copy.title}</Preview>
      <Body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#ffffff', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', maxWidth: 560, margin: '0 auto', padding: 24, borderRadius: 8, border: '1px solid #eee' }}>
          <Heading style={{ fontSize: 20, margin: '0 0 8px' }}>{copy.title}</Heading>
          <Text style={{ margin: '0 0 12px' }}>{display_name ? `Вітаємо, ${display_name}!` : 'Вітаємо!'}</Text>
          <Text style={{ margin: '0 0 12px', color: '#444' }}>{copy.text}</Text>
          {message && (
            <>
              <Hr />
              <Text style={{ margin: '8px 0', whiteSpace: 'pre-wrap', color: '#444' }}>{message}</Text>
            </>
          )}
          <Hr />
          <Text style={{ margin: '8px 0', fontSize: 12, color: '#888' }}>{SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: Email,
  subject: (data) => (COPY[(data.kind as Kind) ?? 'received'] ?? COPY.received).title,
  displayName: 'Review — status update',
  previewData: { display_name: 'Олена', kind: 'approved' },
}
