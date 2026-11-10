import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const url = process.env.PAYOUT_TEST_URL;
const key = process.env.PAYOUT_TEST_KEY;
const token = process.env.PAYOUT_TEST_TOKEN;
describe.skipIf(!url || !key || !token)('payout server access', () => {
  it('denies anonymous payout reads and changes', async () => {
    if (!url || !key) throw new Error('Missing test configuration');
    const db = createClient(url, key, { auth: { persistSession: false } });
    expect((await db.rpc('admin_list_referral_payouts')).error).not.toBeNull();
    expect((await db.rpc('admin_save_referral_bank_details', { p_id: 'ec198da7-ea4a-4a81-9876-3a8be897a2ca', p_expected_status: 'pending', p_account_holder: 'QA', p_bank_name: 'QA Bank', p_account_number: 'DE89370400440532013000' })).error).not.toBeNull();
    expect((await db.rpc('admin_review_referral_payout', { p_id: 'ec198da7-ea4a-4a81-9876-3a8be897a2ca', p_status: 'paid', p_expected_status: 'pending', p_reference: 'QA' })).error).not.toBeNull();
  });
  it('keeps Paid final even through the legacy endpoint', async () => {
    if (!url || !key || !token) throw new Error('Missing test configuration');
    const db = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const result = await db.rpc('admin_set_referral_payout_status', { p_id: 'ec198da7-ea4a-4a81-9876-3a8be897a2ca', p_status: 'processing' });
    expect(result.error?.message).toContain('not_updatable');
    const payout = await db.from('referral_payouts').select('status,transaction_reference').eq('id','ec198da7-ea4a-4a81-9876-3a8be897a2ca').single();
    expect(payout.error).toBeNull();
    expect(payout.data?.status).toBe('paid');
    expect(payout.data?.transaction_reference).toBe('QA-NO-REAL-TRANSFER');
  });
});