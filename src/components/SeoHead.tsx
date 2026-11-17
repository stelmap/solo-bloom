import { Helmet } from "react-helmet-async";
import type { AppLanguage } from '@/i18n/translations';

const SITE = "https://solo-bizz.com";

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  /** Optional JSON-LD object(s) to inject for this route. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
  lang?: AppLanguage;
  ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image';
}

/**
 * Per-route head: unique title, description, canonical, og:url, og:title,
 * og:description. Replaces the static defaults in index.html for crawlers
 * that execute JS.
 */
export function SeoHead({ title, description, path, jsonLd, noindex, lang, ogType = 'website', twitterCard = 'summary_large_image' }: SeoHeadProps) {
  const url = `${SITE}${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet htmlAttributes={lang ? { lang } : undefined}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />
      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content={{ en: 'en_US', uk: 'uk_UA', pl: 'pl_PL', de: 'de_DE', fr: 'fr_FR', ru: 'ru_RU' }[lang ?? 'en']} />
      <meta property="og:image" content={`${SITE}/logo.png`} />
      <meta property="og:image:alt" content="Solo .Bizz" />
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:image" content={`${SITE}/logo.png`} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(b)}</script>
      ))}
    </Helmet>
  );
}
