import { describe, it, expect } from 'vitest';
import { SUBSCRIPTION_OFFER, trialIsActive, requiredPlanForPath } from '../practiceAccess';

describe('new subscription offer', () => {
  it('Solo costs €12 monthly', () => expect(SUBSCRIPTION_OFFER.solo).toBe(12));
  it('Pro costs €24 monthly', () => expect(SUBSCRIPTION_OFFER.pro).toBe(24));
  it('both paid plans have unlimited clients', () => expect(SUBSCRIPTION_OFFER.clientLimit).toBeNull());
  it('trial lasts exactly 14 days, not including the expiry instant', () => {
    const start = '2026-11-11T17:00:00Z';
    expect(trialIsActive(start, Date.parse('2026-11-25T16:59:59Z'))).toBe(true);
    expect(trialIsActive(start, Date.parse('2026-11-25T17:00:00Z'))).toBe(false);
    expect(trialIsActive(null, Date.parse(start))).toBe(false);
  });
  it('advanced finance requires Pro, payments do not', () => {
    expect(requiredPlanForPath('/finances/registers/invoices')).toBe('pro');
    expect(requiredPlanForPath('/payments')).toBeNull();
  });
  it('groups and supervision require Pro', () => {
    expect(requiredPlanForPath('/groups/123')).toBe('pro');
    expect(requiredPlanForPath('/supervision')).toBe('pro');
  });
});