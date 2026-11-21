import uk from '@/assets/landing-hero-share-uk-20261121.png.asset.json';
import en from '@/assets/landing-hero-share-en-20261121.png.asset.json';
import pl from '@/assets/landing-hero-share-pl-20261121.png.asset.json';
import de from '@/assets/landing-hero-share-de-20261121.png.asset.json';
import fr from '@/assets/landing-hero-share-fr-20261121.png.asset.json';
import ru from '@/assets/landing-hero-share-ru-20261121.png.asset.json';
import type { AppLanguage } from '@/i18n/translations';

export const brandPreviewUrl = (lang: AppLanguage) => `https://solo-bizz.com${({ uk, en, pl, de, fr, ru })[lang].url}`;