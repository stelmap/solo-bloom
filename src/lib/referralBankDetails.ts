import type { AppLanguage } from '@/i18n/translations';

export type BankDraft = { accountHolder: string; bankName: string; accountNumber: string; swiftBic: string };
export function validBankDetails(draft: BankDraft) {
  const account = draft.accountNumber.replace(/\s/g, '').toUpperCase();
  const bic = draft.swiftBic.replace(/\s/g, '').toUpperCase();
  return draft.accountHolder.trim().length > 0 && draft.accountHolder.trim().length <= 200
    && draft.bankName.trim().length > 0 && draft.bankName.trim().length <= 200
    && /^[A-Z0-9-]{4,64}$/.test(account) && (!bic || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic));
}
export const bankDetailsCopy: Record<AppLanguage, { title: string; holder: string; bank: string; account: string; bic: string; save: string; saved: string; error: string }> = {
  en: { title: 'Recipient bank details', holder: 'Account holder', bank: 'Bank name', account: 'IBAN / account number', bic: 'SWIFT / BIC (optional)', save: 'Save bank details', saved: 'Bank details saved', error: 'Could not save bank details. Refresh and try again.' },
  uk: { title: 'Банківські реквізити одержувача', holder: 'Власник рахунку', bank: 'Назва банку', account: 'IBAN / номер рахунку', bic: 'SWIFT / BIC (необов’язково)', save: 'Зберегти реквізити', saved: 'Реквізити збережено', error: 'Не вдалося зберегти реквізити. Оновіть і спробуйте ще.' },
  ru: { title: 'Банковские реквизиты получателя', holder: 'Владелец счёта', bank: 'Название банка', account: 'IBAN / номер счёта', bic: 'SWIFT / BIC (необязательно)', save: 'Сохранить реквизиты', saved: 'Реквизиты сохранены', error: 'Не удалось сохранить реквизиты. Обновите и повторите.' },
  pl: { title: 'Dane bankowe odbiorcy', holder: 'Właściciel rachunku', bank: 'Nazwa banku', account: 'IBAN / numer rachunku', bic: 'SWIFT / BIC (opcjonalnie)', save: 'Zapisz dane bankowe', saved: 'Dane bankowe zapisane', error: 'Nie udało się zapisać danych. Odśwież i spróbuj ponownie.' },
  fr: { title: 'Coordonnées bancaires du bénéficiaire', holder: 'Titulaire du compte', bank: 'Nom de la banque', account: 'IBAN / numéro de compte', bic: 'SWIFT / BIC (facultatif)', save: 'Enregistrer les coordonnées', saved: 'Coordonnées enregistrées', error: 'Impossible d’enregistrer les coordonnées. Actualisez et réessayez.' },
};