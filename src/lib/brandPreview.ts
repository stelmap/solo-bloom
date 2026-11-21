import uk from '@/assets/brand-share-uk.jpg.asset.json';
import en from '@/assets/brand-share-en.jpg.asset.json';
import pl from '@/assets/brand-share-pl.jpg.asset.json';
import de from '@/assets/brand-share-de.jpg.asset.json';
import fr from '@/assets/brand-share-fr.jpg.asset.json';
import ru from '@/assets/brand-share-ru.jpg.asset.json';
import type { AppLanguage } from '@/i18n/translations';

export const brandPreviewUrl = (lang: AppLanguage) => `https://solo-bizz.com${({ uk, en, pl, de, fr, ru })[lang].url}`;