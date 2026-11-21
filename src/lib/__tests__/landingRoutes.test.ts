import { describe, expect, it } from 'vitest';
import { landingLanguage, landingPath, landingPathLanguage, legacyLandingTarget, landingAlternates, MAX_PRERENDER_PAGES } from '../landingRoutes';

describe('localized marketing routing rules', () => {
  it('supports exactly the six existing languages', () => {
    expect(landingAlternates().map(x => x.lang)).toEqual(['uk', 'en', 'pl', 'de', 'fr', 'ru']);
    expect(landingPathLanguage('/es/')).toBeNull();
    expect(MAX_PRERENDER_PAGES).toBe(7);
  });
  it('uses an explicit path over stale language queries', () => {
    expect(landingLanguage('/uk/', '?lang=pl')).toBe('uk');
    expect(landingLanguage('/de', '')).toBe('de');
    expect(landingLanguage('/', '')).toBe('en');
  });
  it('preserves the selected section and unrelated campaign parameters', () => {
    expect(landingPath('pl', '?lang=uk&utm_source=facebook&ref=abc', '#pricing')).toBe('/pl/?utm_source=facebook&ref=abc#pricing');
  });
  it('supports legacy language links without rewriting unrelated paths or queries', () => {
    expect(legacyLandingTarget('/', '?lang=uk&utm_campaign=launch', '#how')).toBe('/uk/?utm_campaign=launch#how');
    expect(legacyLandingTarget('/privacy', '?lang=uk')).toBeNull();
    expect(legacyLandingTarget('/', '?utm_source=facebook')).toBeNull();
    expect(legacyLandingTarget('/', '?lang=unknown')).toBeNull();
  });
  it('never rewrites OAuth callback parameters or fragments', () => {
    expect(legacyLandingTarget('/', '?lang=uk&code=example')).toBeNull();
    expect(legacyLandingTarget('/', '?lang=uk', '#access_token=example')).toBeNull();
  });
});