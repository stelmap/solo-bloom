import type { AppLanguage } from '@/i18n/translations';
import { PUBLIC_LANGUAGES, publicLanguage } from './publicLanguage';

export const LANDING_ORIGIN = 'https://solo-bizz.com';
export const LANDING_DEFAULT_LANGUAGE: AppLanguage = 'en';
export const MAX_PRERENDER_PAGES = 7;

export function landingPathLanguage(pathname: string): AppLanguage | null {
  const match = /^\/(uk|en|pl|de|fr|ru)\/?$/.exec(pathname);
  return match ? publicLanguage(match[1]) : null;
}

export function landingLanguage(pathname: string, search: string): AppLanguage {
  return landingPathLanguage(pathname) ?? publicLanguage(new URLSearchParams(search).get('lang')) ?? LANDING_DEFAULT_LANGUAGE;
}

export function landingPath(lang: AppLanguage, search = '', hash = ''): string {
  const params = new URLSearchParams(search);
  params.delete('lang');
  const query = params.toString();
  return `/${lang}/${query ? `?${query}` : ''}${hash}`;
}

/** Only the marketing root's recognized language query is eligible; OAuth stays untouched. */
export function legacyLandingTarget(pathname: string, search: string, hash = ''): string | null {
  const params = new URLSearchParams(search);
  const lang = publicLanguage(params.get('lang'));
  if (pathname !== '/' || !lang || params.has('code') || params.has('error') || /access_token|error=/.test(hash)) return null;
  return landingPath(lang, search, hash);
}

export const landingAlternates = () => PUBLIC_LANGUAGES.map(lang => ({ lang, url: `${LANDING_ORIGIN}${landingPath(lang)}` }));