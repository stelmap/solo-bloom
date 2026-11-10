import { describe, expect, it } from 'vitest';
import { validBankDetails } from '../referralBankDetails';
const draft = { accountHolder: 'Test Recipient', bankName: 'Test Bank', accountNumber: 'DE89 3704 0044 0532 0130 00', swiftBic: 'COBADEFFXXX' };
describe('manual payout bank details', () => {
  it('accepts recipient bank details with spaced IBAN', () => expect(validBankDetails(draft)).toBe(true));
  it('requires the account holder', () => expect(validBankDetails({ ...draft, accountHolder: ' ' })).toBe(false));
  it('requires the bank', () => expect(validBankDetails({ ...draft, bankName: '' })).toBe(false));
  it('requires an account number', () => expect(validBankDetails({ ...draft, accountNumber: '' })).toBe(false));
  it('allows an omitted BIC', () => expect(validBankDetails({ ...draft, swiftBic: '' })).toBe(true));
  it('rejects malformed BIC', () => expect(validBankDetails({ ...draft, swiftBic: '123' })).toBe(false));
});