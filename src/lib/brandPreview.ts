import uk from '@/assets/brand-preview-uk.png.asset.json';
import en from '@/assets/brand-preview-en.png.asset.json';
import pl from '@/assets/brand-preview-pl.png.asset.json';
import de from '@/assets/brand-preview-de.png.asset.json';
import fr from '@/assets/brand-preview-fr.png.asset.json';
import ru from '@/assets/brand-preview-ru.png.asset.json';
import type { AppLanguage } from '@/i18n/translations';

export const brandPreviewUrl = (lang: AppLanguage) => `https://solo-bizz.com${({ uk, en, pl, de, fr, ru })[lang].url}`;