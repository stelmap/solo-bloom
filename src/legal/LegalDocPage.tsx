import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage, setPreLoginLang } from "@/i18n/LanguageContext";
import type { AppLanguage } from "@/i18n/translations";
import type { LegalBlock, LegalDoc } from "@/legal/types";
import { localizedPath, publicLanguage, PUBLIC_NAV_COPY } from '@/lib/publicLanguage';

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|info@solo-bizz\.com)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part === "info@solo-bizz.com") {
      return (
        <a key={i} href="mailto:info@solo-bizz.com" className="text-primary hover:underline">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function Block({ block }: { block: LegalBlock }) {
  const { lang } = useLanguage();
  if (Array.isArray(block)) {
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        {block.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof block === "object" && block.type === "link") {
    return (
      <p className="mt-3">
        <Link to={block.to.startsWith('/') ? localizedPath(block.to, lang === 'de' ? 'en' : lang) : block.to} className="font-medium text-primary hover:underline">
          {block.label} →
        </Link>
      </p>
    );
  }

  if (typeof block === "object" && block.type === "table") {
    return (
      <div className="mt-3 w-full overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              {block.headers.map((h, i) => (
                <th key={i} className="border-b border-border px-3 py-2 font-semibold text-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="align-top">
                {row.map((cell, ci) => (
                  <td key={ci} className="border-b border-border px-3 py-2 text-muted-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p className="mt-2 leading-relaxed text-muted-foreground">{renderInline(block as string)}</p>;
}

type Props = {
  path: string;
  seoTitle: string;
  seoDescription: string;
  content: Record<AppLanguage, LegalDoc>;
};

export function LegalDocPage({ path, seoTitle, seoDescription, content }: Props) {
  const { lang, setLang } = useLanguage();
  const location = useLocation();
  // Skip languages that only reuse the English text (e.g. German until reviewed).
  const available = (Object.keys(content) as AppLanguage[]).filter((l) => l === "en" || content[l] !== content.en);
  const requested = publicLanguage(new URLSearchParams(location.search).get('lang'));
  const docLang = requested && available.includes(requested) ? requested : 'en';
  // ?lang= selects a language-specific URL; the plain path stays English so
  // existing links keep working.
  useEffect(() => {
    const q = requested;
    if (q && q !== lang) { setPreLoginLang(q); setLang(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  const doc = content[docLang];
  const seoLang: AppLanguage = docLang;
  const urlFor = (l: AppLanguage) => (l === "en" ? path : `${path}?lang=${l}`);
  const firstText = [doc.intro, ...doc.sections.flatMap((x) => x.body)].find((b) => typeof b === "string") as string | undefined;
  const plainDesc = (firstText ?? "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  const localDesc = seoLang === "en" ? seoDescription : plainDesc.length > 155 ? plainDesc.slice(0, 154).trimEnd() + "…" : plainDesc || seoDescription;
  const localTitle = seoLang === "en" ? seoTitle : `${doc.title} — Solo .Bizz`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SeoHead lang={seoLang} path={urlFor(seoLang)} title={localTitle} description={localDesc} />
      <Helmet htmlAttributes={{ lang: seoLang }}>
        {available.map((l) => <link key={l} rel="alternate" hrefLang={l} href={`https://solo-bizz.com${urlFor(l)}`} />)}
        <link rel="alternate" hrefLang="x-default" href={`https://solo-bizz.com${path}`} />
      </Helmet>
      <nav className="mx-auto flex w-full max-w-3xl justify-end px-4 pt-6" aria-label={PUBLIC_NAV_COPY[lang].language}>
        <select aria-label={PUBLIC_NAV_COPY[lang].language} value={docLang} onChange={e => window.location.assign(localizedPath(path, e.target.value as AppLanguage))} className="rounded-md border border-input bg-background p-2 text-sm">
          {available.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </nav>
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link to={localizedPath('/', lang)} className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {doc.back}
        </Link>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{doc.updated}</p>
        {requested === "de" ? (
          <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            Dieses Dokument ist auf Englisch verfügbar.
          </p>
        ) : null}
        {doc.intro ? <p className="mt-6 leading-relaxed text-muted-foreground">{renderInline(doc.intro)}</p> : null}

        <div className="mt-10 space-y-8 text-foreground/90">
          {doc.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">{section.h}</h2>
              {section.body.map((block, bIdx) => (
                <Block key={bIdx} block={block} />
              ))}
            </section>
          ))}
        </div>
      </div>
      <div className="mt-auto">
        <PublicFooter />
      </div>
    </div>
  );
}
