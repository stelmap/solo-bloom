import { Helmet } from "react-helmet-async";

const SITE = "https://solo-bizz.com";

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  /** Optional JSON-LD object(s) to inject for this route. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

/**
 * Per-route head: unique title, description, canonical, og:url, og:title,
 * og:description. Replaces the static defaults in index.html for crawlers
 * that execute JS.
 */
export function SeoHead({ title, description, path, jsonLd, noindex }: SeoHeadProps) {
  const url = `${SITE}${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
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
