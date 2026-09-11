import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage } from "@/i18n/LanguageContext";
import type { AppLanguage } from "@/i18n/translations";
import type { LegalBlock, LegalDoc } from "@/legal/types";

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
        <Link to={block.to} className="font-medium text-primary hover:underline">
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
  const { lang } = useLanguage();
  const doc = content[lang] ?? content.en;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SeoHead path={path} title={seoTitle} description={seoDescription} />
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {doc.back}
        </Link>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{doc.updated}</p>
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
