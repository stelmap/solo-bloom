import type { AppLanguage } from '@/i18n/translations';
import { TERMS_CONTENT } from '@/legal/terms';
import type { LegalDoc } from '@/legal/types';

/** Reuse the approved operator line and current disclosures, without changing refund rights. */
export function currentLegalContent(content: Record<AppLanguage, LegalDoc>, kind: 'privacy' | 'refund' | 'cookies'): Record<AppLanguage, LegalDoc> {
  const result = { ...content };
  for (const lang of ['en', 'uk', 'pl', 'fr', 'ru'] as const) {
    const doc = content[lang];
    const terms = TERMS_CONTENT[lang];
    const operator = terms.sections[0]?.body[0];
    const disclosure = terms.sections[14];
    if (!operator || !disclosure) continue;
    const controller = {
      en: 'For processing where this policy identifies Solo .Bizz as controller, the operator named above is the data controller. Privacy contact: info@solo-bizz.com.',
      uk: 'Для обробки, у якій ця політика визначає Solo .Bizz контролером, контролером даних є зазначений вище оператор. Контакт з питань приватності: info@solo-bizz.com.',
      pl: 'W przypadku przetwarzania, dla którego ta polityka wskazuje Solo .Bizz jako administratora, administratorem danych jest operator wskazany powyżej. Kontakt w sprawach prywatności: info@solo-bizz.com.',
      fr: 'Pour les traitements pour lesquels cette politique désigne Solo .Bizz comme responsable, le responsable du traitement est l’exploitant nommé ci-dessus. Contact vie privée : info@solo-bizz.com.',
      ru: 'Для обработки, в которой эта политика определяет Solo .Bizz как контролера, контролером данных является указанный выше оператор. Контакт по вопросам приватности: info@solo-bizz.com.',
    };
    result[lang] = {
      ...doc,
      updated: terms.updated,
      sections: [
        ...doc.sections.map((section, index) => index === 0 ? {
          ...section,
          body: kind === 'privacy' ? [operator, controller[lang], ...section.body.slice(3)] : [operator, ...section.body.slice(kind === 'cookies' ? 0 : 1)],
        } : section),
        { h: disclosure.h.replace(/^15\./, `${doc.sections.length + 1}.`), body: disclosure.body.slice(2) },
      ],
    };
  }
  result.de = result.en;
  return result;
}