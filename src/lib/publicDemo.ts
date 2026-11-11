import { parseMeetingDuration, parseNonnegativePrice } from './meetingDuration';

export const DEMO_STORAGE_KEY = 'solo-bizz-public-demo-v1';
export const DEMO_TTL_MS = 2 * 60 * 60 * 1000;
export interface DemoClient { id: string; name: string; email: string; phone: string; notes: string; status: 'active' | 'archived' }
export interface DemoService { id: string; name: string; duration_minutes: number; price: number }
export interface DemoMeeting { id: string; client_id: string; service_id: string; date: string; time: string; duration: number; price: number }
export interface DemoPayment { id: string; client_id: string; meeting_id: string | null; date: string; amount: number; confirmed: boolean }
export interface DemoState { version: 1; expiresAt: number; clients: DemoClient[]; services: DemoService[]; meetings: DemoMeeting[]; payments: DemoPayment[] }
export function seedDemo(now = Date.now()): DemoState {
  const date = new Date(now).toISOString().slice(0, 10);
  return { version: 1, expiresAt: now + DEMO_TTL_MS,
    clients: ['Alex Morgan', 'Jamie Parker', 'Robin Taylor', 'Sam Rivera'].map((name, i) => ({ id: `demo-client-${i}`, name, email: `client${i + 1}@example.invalid`, phone: '', notes: '', status: 'active' })),
    services: [{ id: 'demo-service-0', name: 'Consultation', duration_minutes: 60, price: 60 }, { id: 'demo-service-1', name: 'Follow-up', duration_minutes: 45, price: 45 }],
    meetings: [0, 1, 2].map(i => ({ id: `demo-meeting-${i}`, client_id: `demo-client-${i}`, service_id: 'demo-service-0', date, time: `${10 + i * 2}:00`, duration: 60, price: 60 })),
    payments: [{ id: 'demo-payment-0', client_id: 'demo-client-0', meeting_id: 'demo-meeting-0', date, amount: 60, confirmed: true }, { id: 'demo-payment-1', client_id: 'demo-client-2', meeting_id: 'demo-meeting-2', date, amount: 20, confirmed: true }, { id: 'demo-payment-2', client_id: 'demo-client-3', meeting_id: null, date, amount: 120, confirmed: true }],
  };
}
export function restoreDemo(raw: string | null, now = Date.now()): DemoState {
  try {
    const state = JSON.parse(raw ?? 'null');
    if (state?.version === 1 && state.expiresAt > now && ['clients', 'services', 'meetings', 'payments'].every(key => Array.isArray(state[key]))) return state;
  } catch { /* Expired or invalid visitor-local state is replaced. */ }
  return seedDemo(now);
}
export function saveDemoClient(state: DemoState, client: DemoClient): DemoState {
  if (!client.name.trim()) throw new Error('Name required');
  return { ...state, clients: [...state.clients.filter(c => c.id !== client.id), { ...client, name: client.name.trim() }] };
}
export function saveDemoMeeting(state: DemoState, meeting: DemoMeeting): DemoState {
  if (!state.clients.some(c => c.id === meeting.client_id) || !state.services.some(s => s.id === meeting.service_id) || parseMeetingDuration(meeting.duration) === null || parseNonnegativePrice(meeting.price) === null || !/^\d{4}-\d{2}-\d{2}$/.test(meeting.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(meeting.time)) throw new Error('Invalid meeting');
  return { ...state, meetings: [...state.meetings.filter(m => m.id !== meeting.id), meeting] };
}
export function saveDemoPayment(state: DemoState, payment: DemoPayment): DemoState {
  const meeting = state.meetings.find(m => m.id === payment.meeting_id);
  if (!state.clients.some(c => c.id === payment.client_id) || parseNonnegativePrice(payment.amount) === null || (payment.meeting_id !== null && (!meeting || meeting.client_id !== payment.client_id))) throw new Error('Invalid payment');
  return { ...state, payments: [...state.payments.filter(p => p.id !== payment.id), payment] };
}
export function demoMeetingBalance(state: DemoState, meeting: DemoMeeting) {
  const paid = state.payments.filter(p => p.meeting_id === meeting.id && p.confirmed).reduce((sum, p) => sum + p.amount, 0);
  return { paid, remaining: Math.max(0, meeting.price - paid), status: paid >= meeting.price ? 'paid' : paid > 0 ? 'partial' : 'unpaid' } as const;
}
export function demoMetrics(state: DemoState, month = new Date().toISOString().slice(0, 7)) {
  const meetings = state.meetings.filter(m => m.date.startsWith(month));
  return { clients: state.clients.filter(c => c.status === 'active').length, potential: meetings.reduce((sum, m) => sum + m.price, 0), actual: state.payments.filter(p => p.confirmed && p.date.startsWith(month)).reduce((sum, p) => sum + p.amount, 0), unpaid: meetings.filter(m => demoMeetingBalance(state, m).remaining > 0).length };
}