import { describe, expect, it } from 'vitest';
import { localizedPath, publicLanguage, publicUrlLanguage } from '../publicLanguage';

describe('public language URLs', () => {
  it('keeps language-free marketing URLs English regardless of previous selection', () => {
    expect(publicUrlLanguage('')).toBe('en');
    expect(publicUrlLanguage('?lang=pl')).toBe('pl');
  });
  it('preserves Polish recovery while discarding the nonexistent path', () => {
    expect(localizedPath('/', 'pl')).toBe('/?lang=pl');
  });
  it('keeps old English URLs canonical and preserves section anchors', () => {
    expect(localizedPath('/terms?lang=en', 'en')).toBe('/terms');
    expect(localizedPath('/#pricing', 'uk')).toBe('/?lang=uk#pricing');
  });
  it('supports German without accepting unsupported URL language values', () => {
    expect(publicLanguage('de')).toBe('de');
    expect(publicLanguage('xx')).toBeNull();
  });
});