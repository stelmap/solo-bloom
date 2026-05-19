/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Solo Bizz'

interface DomainStatusAlertData {
  host: string
  url: string
  previous_state: 'active' | 'unreachable' | 'unknown'
  current_state: 'active' | 'unreachable'
  status_code?: number
  error?: string
  latency_ms?: number
  checked_at: string
}

const formatTransition = (prev: string, next: string) => {
  if (next === 'unreachable') return prev === 'active' ? '🔴 Domain went DOWN' : '🔴 Domain is unreachable'
  return prev === 'unreachable' ? '🟢 Domain RECOVERED' : '🟢 Domain is now active'
}

const Email: React.FC<DomainStatusAlertData> = ({
  host, url, previous_state, current_state, status_code, error, latency_ms, checked_at,
}) => {
  const isDown = current_state === 'unreachable'
  const accent = isDown ? '#dc2626' : '#059669'
  return (
    <Html lang="en">
      <Head />
      <Preview>{formatTransition(previous_state, current_state)} — {host}</Preview>
      <Body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#ffffff', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', maxWidth: 560, margin: '0 auto', padding: 24, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <Heading style={{ fontSize: 20, margin: '0 0 8px', color: accent }}>
            {formatTransition(previous_state, current_state)}
          </Heading>
          <Text style={{ color: '#666', margin: '0 0 16px' }}>
            {SITE_NAME} domain status change detected.
          </Text>
          <Hr />
          <Section>
            <Text style={{ margin: '8px 0' }}><strong>Host:</strong> {host}</Text>
            <Text style={{ margin: '8px 0' }}><strong>URL:</strong> <a href={url}>{url}</a></Text>
            <Text style={{ margin: '8px 0' }}>
              <strong>Status:</strong>{' '}
              <span style={{ color: accent, fontWeight: 600 }}>{current_state.toUpperCase()}</span>
              {' '}(was {previous_state})
            </Text>
            {typeof status_code === 'number' && (
              <Text style={{ margin: '8px 0' }}><strong>HTTP code:</strong> {status_code}</Text>
            )}
            {typeof latency_ms === 'number' && (
              <Text style={{ margin: '8px 0' }}><strong>Latency:</strong> {latency_ms} ms</Text>
            )}
            {error && (
              <Text style={{ margin: '8px 0', color: '#dc2626' }}><strong>Error:</strong> {error}</Text>
            )}
            <Text style={{ margin: '8px 0', color: '#666' }}>
              <strong>Checked at:</strong> {new Date(checked_at).toUTCString()}
            </Text>
          </Section>
          {isDown && (
            <>
              <Hr />
              <Text style={{ margin: '8px 0', fontSize: 13, color: '#666' }}>
                Check the Domains panel in Lovable for connection / SSL provisioning status,
                and verify DNS records at your registrar.
              </Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: Email,
  subject: (data) => {
    const arrow = data.current_state === 'unreachable' ? '🔴 DOWN' : '🟢 UP'
    return `[${SITE_NAME}] ${arrow} — ${data.host}`
  },
  to: 'o.gilevich@gmail.com',
  displayName: 'Domain status alert',
  previewData: {
    host: 'solo-bizz.com',
    url: 'https://solo-bizz.com/',
    previous_state: 'active',
    current_state: 'unreachable',
    status_code: 404,
    latency_ms: 312,
    checked_at: new Date().toISOString(),
  },
}
