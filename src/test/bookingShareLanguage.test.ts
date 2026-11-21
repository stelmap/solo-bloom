import { describe, expect, it } from 'vitest';
import { bookingShareUrl } from '../lib/therapistProfile';
import type { AppLanguage } from '../i18n/translations';

describe('public booking share languages', () => {
  for (const lang of ['uk', 'en', 'pl', 'de', 'fr', 'ru'] as AppLanguage[]) {
    it(`opens the shared booking in ${lang}`, () => {
      const url = new URL(bookingShareUrl('olga', lang));
      expect(url.searchParams.get('lang')).toBe(lang);
      expect(url.origin).toBe(window.location.origin);
      expect(url.pathname).toBe('/book/olga');
    });
  }
  it('preserves legacy links without a language parameter', () => {
    expect(bookingShareUrl('olga')).toBe(`${window.location.origin}/book/olga`);
  });
});