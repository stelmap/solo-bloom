import { describe, expect, it } from 'vitest';
import { canTriggerBookingConfirmation } from '../../../supabase/functions/send-booking-confirmation-email/trigger-access';

const now = Date.parse('2026-11-17T20:12:00Z');
const oldRequest = { user_id: 'therapist-owner', created_at: '2026-11-17T19:12:00Z' };

describe('booking confirmation trigger access', () => {
  it('allows the verified owner to approve a one-hour-old request', () => {
    expect(canTriggerBookingConfirmation(oldRequest, 'therapist-owner', now)).toBe(true);
  });
  it('allows the verified owner to retry a day-old confirmation', () => {
    expect(canTriggerBookingConfirmation({ ...oldRequest, created_at: '2026-11-16T20:12:00Z' }, 'therapist-owner', now)).toBe(true);
  });
  it('does not let another therapist bypass the ten-minute window', () => {
    expect(canTriggerBookingConfirmation(oldRequest, 'other-therapist', now)).toBe(false);
  });
  it('rejects an expired anonymous trigger', () => {
    expect(canTriggerBookingConfirmation(oldRequest, undefined, now)).toBe(false);
  });
  it('preserves immediate anonymous auto-confirmation', () => {
    expect(canTriggerBookingConfirmation({ ...oldRequest, created_at: '2026-11-17T20:11:00Z' }, undefined, now)).toBe(true);
  });
  it('keeps the public window at ten minutes, not ten minutes plus one millisecond', () => {
    expect(canTriggerBookingConfirmation({ ...oldRequest, created_at: new Date(now - 600000).toISOString() }, undefined, now)).toBe(true);
    expect(canTriggerBookingConfirmation({ ...oldRequest, created_at: new Date(now - 600001).toISOString() }, undefined, now)).toBe(false);
  });
  it('rejects invalid public timestamps', () => {
    expect(canTriggerBookingConfirmation({ ...oldRequest, created_at: 'invalid' }, undefined, now)).toBe(false);
  });
});