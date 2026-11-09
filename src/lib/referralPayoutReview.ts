export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'rejected' | 'cancelled';
export type ReviewAction = 'processing' | 'paid' | 'rejected';

export function canReviewPayout(status: string, action: ReviewAction) {
  return (status === 'pending' || status === 'processing') && status !== action;
}

export function payoutReviewError(status: string, action: ReviewAction, reference: string, note: string, transferred: boolean): string | null {
  if (!canReviewPayout(status, action)) return 'not_updatable';
  if (action === 'paid' && (!reference.trim() || !transferred)) return 'reference_required';
  if (action === 'rejected' && !note.trim()) return 'reason_required';
  return null;
}