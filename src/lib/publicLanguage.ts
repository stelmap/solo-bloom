import type { AppLanguage } from '@/i18n/translations';

export const PUBLIC_LANGUAGES: AppLanguage[] = ['uk', 'en', 'pl', 'de', 'fr', 'ru'];
export const LEGAL_LANGUAGES: AppLanguage[] = ['en', 'uk', 'pl', 'fr', 'ru'];

export function publicLanguage(value: string | null): AppLanguage | null {
  return PUBLIC_LANGUAGES.includes(value as AppLanguage) ? value as AppLanguage : null;
}

export function publicUrlLanguage(search: string): AppLanguage {
  return publicLanguage(new URLSearchParams(search).get('lang')) ?? 'en';
}

export function localizedPath(path: string, lang: AppLanguage): string {
  const [base, hash] = path.split('#');
  const url = new URL(base, 'https://solo-bizz.com');
  if (lang === 'en') url.searchParams.delete('lang');
  else url.searchParams.set('lang', lang);
  return `${url.pathname}${url.search}${hash ? `#${hash}` : ''}`;
}

export const PUBLIC_NAV_COPY = {
  en: { title: 'Page not found', heading: 'This page wandered off', before: "We couldn't find", after: 'It may have been moved, renamed, or never existed.', home: 'Back to home', back: 'Go back', jump: 'Or jump to:', language: 'Language', previous: 'Previous month', next: 'Next month', cookies: 'Cookie Policy', cookieSettings: 'Cookie settings' },
  uk: { title: 'Сторінку не знайдено', heading: 'Ця сторінка загубилася', before: 'Не вдалося знайти', after: 'Можливо, її перемістили, перейменували або вона ніколи не існувала.', home: 'На головну', back: 'Назад', jump: 'Або перейти до:', language: 'Мова', previous: 'Попередній місяць', next: 'Наступний місяць', cookies: 'Політика cookie', cookieSettings: 'Налаштування cookie' },
  pl: { title: 'Nie znaleziono strony', heading: 'Ta strona się zgubiła', before: 'Nie znaleźliśmy', after: 'Być może została przeniesiona, zmieniono jej nazwę lub nigdy nie istniała.', home: 'Strona główna', back: 'Wstecz', jump: 'Lub przejdź do:', language: 'Język', previous: 'Poprzedni miesiąc', next: 'Następny miesiąc', cookies: 'Polityka plików cookie', cookieSettings: 'Ustawienia cookie' },
  de: { title: 'Seite nicht gefunden', heading: 'Diese Seite ist verschwunden', before: 'Wir konnten diese Seite nicht finden:', after: 'Vielleicht wurde sie verschoben, umbenannt oder hat nie existiert.', home: 'Zur Startseite', back: 'Zurück', jump: 'Oder weiter zu:', language: 'Sprache', previous: 'Vorheriger Monat', next: 'Nächster Monat', cookies: 'Cookie-Richtlinie', cookieSettings: 'Cookie-Einstellungen' },
  fr: { title: 'Page introuvable', heading: 'Cette page s’est égarée', before: 'Nous n’avons pas trouvé', after: 'Elle a peut-être été déplacée, renommée ou n’a jamais existé.', home: 'Retour à l’accueil', back: 'Retour', jump: 'Ou accéder à :', language: 'Langue', previous: 'Mois précédent', next: 'Mois suivant', cookies: 'Politique de cookies', cookieSettings: 'Paramètres des cookies' },
  ru: { title: 'Страница не найдена', heading: 'Эта страница потерялась', before: 'Не удалось найти', after: 'Возможно, её переместили, переименовали или она никогда не существовала.', home: 'На главную', back: 'Назад', jump: 'Или перейти к:', language: 'Язык', previous: 'Предыдущий месяц', next: 'Следующий месяц', cookies: 'Политика cookie', cookieSettings: 'Настройки cookie' },
} satisfies Record<AppLanguage, Record<string, string>>;
/** Legal link that keeps the visitor's language when a translation exists. */
export function legalPath(path: string, lang: string): string {
  const l = LEGAL_LANGUAGES.includes(lang as AppLanguage) ? (lang as AppLanguage) : 'en';
  return localizedPath(path, l);
}
