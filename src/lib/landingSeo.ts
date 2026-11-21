import type { AppLanguage } from '@/i18n/translations';
import { oc } from './landingOfferCopy';
import { brandPreviewUrl } from './brandPreview';
import { landingPath, LANDING_ORIGIN } from './landingRoutes';

export const LANDING_LOCALES: Record<AppLanguage, string> = { en: 'en_US', uk: 'uk_UA', pl: 'pl_PL', de: 'de_DE', fr: 'fr_FR', ru: 'ru_RU' };
const descriptions: Record<AppLanguage, string> = {
  uk: 'Календар, клієнти, онлайн-запис, оплати та публічний профіль для приватної практики. Solo від €12/місяць, Pro €24/місяць. 14 днів безплатно без картки.',
  en: 'Calendar, clients, online booking, payments and a public profile for your private practice. Solo €12/month, Pro €24/month. Try 14 days free without a card.',
  pl: 'Kalendarz, klienci, rezerwacje online, płatności i profil publiczny dla prywatnej praktyki. Solo 12 €/mies., Pro 24 €/mies. 14 dni bezpłatnie bez karty.',
  de: 'Kalender, Klienten, Online-Buchung, Zahlungen und ein öffentliches Profil für Ihre Praxis. Solo 12 €/Monat, Pro 24 €/Monat. 14 Tage kostenlos ohne Karte.',
  fr: 'Agenda, clients, réservation en ligne, paiements et profil public pour votre cabinet. Solo 12 €/mois, Pro 24 €/mois. 14 jours gratuits sans carte.',
  ru: 'Календарь, клиенты, онлайн-запись, оплаты и публичный профиль для частной практики. Solo €12/месяц, Pro €24/месяц. 14 дней бесплатно без карты.',
};

export function landingSeo(lang: AppLanguage) {
  return { title: `Solo .Bizz — ${oc(lang, 'headline')}`, description: descriptions[lang], url: `${LANDING_ORIGIN}${landingPath(lang)}`, image: brandPreviewUrl(lang), imageAlt: `Solo .Bizz — ${oc(lang, 'headline')}`, locale: LANDING_LOCALES[lang] };
}