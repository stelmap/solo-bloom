import { describe, it, expect } from 'vitest';
import { seedDemo, restoreDemo, saveDemoClient, saveDemoMeeting, saveDemoPayment, demoMetrics, demoMeetingBalance, DEMO_TTL_MS } from '../publicDemo';
const now = Date.UTC(2026, 10, 11, 12);
describe('isolated public workspace', () => {
  it('starts with paid, unpaid, partial and prepaid examples', () => {
    const s = seedDemo(now);
    expect(s.meetings.map(m => demoMeetingBalance(s, m).status)).toEqual(['paid', 'unpaid', 'partial']);
    expect(s.payments.find(p => p.meeting_id === null)?.amount).toBe(120);
  });
  it('keeps visitors independent', () => {
    const a = seedDemo(now), b = seedDemo(now);
    const edited = saveDemoClient(a, { ...a.clients[0], id: 'new', name: 'Visitor A' });
    expect(edited.clients.length).toBe(5);
    expect(b.clients.length).toBe(4);
  });
  it('expires and resets temporary records', () => {
    const s = seedDemo(now); s.clients = [];
    expect(restoreDemo(JSON.stringify(s), now + DEMO_TTL_MS).clients.length).toBe(4);
    expect(restoreDemo(JSON.stringify(s), now + 1).clients.length).toBe(0);
  });
  it('links creation and payment to dashboard metrics', () => {
    let s = seedDemo(now);
    s = saveDemoMeeting(s, { ...s.meetings[0], id: 'new-meeting', duration: 50, price: 100 });
    expect(demoMetrics(s, '2026-11').potential).toBe(280);
    s = saveDemoPayment(s, { id: 'new-payment', client_id: s.clients[0].id, meeting_id: 'new-meeting', date: '2026-11-11', amount: 40, confirmed: true });
    expect(demoMetrics(s, '2026-11').actual).toBe(240);
    expect(demoMeetingBalance(s, s.meetings.find(m => m.id === 'new-meeting') ?? s.meetings[0]).remaining).toBe(60);
  });
  it('editing confirmation recalculates income without changing potential', () => {
    const s = seedDemo(now);
    const edited = saveDemoPayment(s, { ...s.payments[0], confirmed: false });
    expect(demoMetrics(edited, '2026-11').actual).toBe(140);
    expect(demoMetrics(edited, '2026-11').potential).toBe(180);
  });
  it('rejects payments for another client meeting', () => {
    const s = seedDemo(now);
    expect(() => saveDemoPayment(s, { ...s.payments[0], client_id: s.clients[1].id })).toThrow();
  });
  it('preserves a one minute meeting without changing service defaults', () => {
    const s = seedDemo(now), edited = saveDemoMeeting(s, { ...s.meetings[0], duration: 1 });
    expect(edited.meetings.find(m => m.id === s.meetings[0].id)?.duration).toBe(1);
    expect(edited.services[0].duration_minutes).toBe(60);
  });
});