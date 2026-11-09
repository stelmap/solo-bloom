import { describe, expect, it } from 'vitest';
import { canReviewPayout, payoutReviewError } from '../referralPayoutReview';

describe('payout review', () => {
  it('allows approving a pending payout for processing', () => {
    expect(canReviewPayout('pending', 'processing')).toBe(true);
    expect(canReviewPayout('processing', 'processing')).toBe(false);
  });
  it('requires transfer confirmation and a reference to mark Paid', () => {
    expect(payoutReviewError('processing', 'paid', '', '', true)).toBe('reference_required');
    expect(payoutReviewError('pending', 'paid', 'BANK-123', '', false)).toBe('reference_required');
    expect(payoutReviewError('processing', 'paid', 'BANK-123', '', true)).toBeNull();
  });
  it('requires a rejection reason', () => {
    expect(payoutReviewError('pending', 'rejected', '', ' ', false)).toBe('reason_required');
    expect(payoutReviewError('pending', 'rejected', '', 'Invalid IBAN', false)).toBeNull();
  });
  it('never allows changing terminal payouts', () => {
    for (const status of ['paid', 'rejected', 'cancelled']) {
      expect(canReviewPayout(status, 'paid')).toBe(false);
      expect(canReviewPayout(status, 'processing')).toBe(false);
      expect(canReviewPayout(status, 'rejected')).toBe(false);
    }
  });
});