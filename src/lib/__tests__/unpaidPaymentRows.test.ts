import { describe, expect, it } from 'vitest';
import { unpaidPaymentRows } from '../unpaidPaymentRows';

describe('unpaid payment rows', () => {
  it('shows the single €100 participant debt rather than unpaid group parents', () => {
    const rows = unpaidPaymentRows([{ id: 'gsp:participant', kind: 'group', amount: 100, price: 100 }]);
    expect(rows).toHaveLength(1);
    expect(rows.reduce((sum, row) => sum + row.remaining, 0)).toBe(100);
  });
  it('shows only the unpaid remainder of a partially prepaid participant', () => {
    expect(unpaidPaymentRows([{ id: 'partial', kind: 'group', amount: 40, price: 100 }])[0]).toMatchObject({ price: 100, paid: 60, remaining: 40 });
  });
  it('keeps opening debt separate and excludes settled balances', () => {
    expect(unpaidPaymentRows([{ id: 'opening', kind: 'opening', amount: 100 }, { id: 'paid', kind: 'group', amount: 0 }])).toEqual([]);
  });
});