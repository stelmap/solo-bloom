import { Copy, ExternalLink, Instagram, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { TP_COPY, profileShareUrl, profileUrl, type TPLang } from "@/lib/therapistProfile";

export function PublicProfileLinkCard({ lang, slug, published }: { lang: TPLang; slug: string | null; published: boolean }) {
  const C = TP_COPY[lang];
  const { toast } = useToast();
  const url = published && slug ? profileUrl(slug) : "";
  const share = published && slug ? profileShareUrl(slug) : "";
  const copy = async (hint?: string) => {
    await navigator.clipboard.writeText(share);
    toast({ title: C.linkCopied, description: hint });
  };
  const e = encodeURIComponent(share);
  const targets: [string, string][] = [
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${e}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${e}`],
    ["X (Twitter)", `https://twitter.com/intent/tweet?url=${e}`],
    ["Telegram", `https://t.me/share/url?url=${e}`],
    ["WhatsApp", `https://wa.me/?text=${e}`],
  ];
  const nativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{C.linkTitle}</h3>
        <Badge variant={published ? "default" : "secondary"}>{published ? C.published : C.notPublished}</Badge>
      </div>
      {!url ? (
        <p className="text-sm text-muted-foreground">{C.publishToShare}</p>
      ) : (
        <>
          <Input readOnly value={url} className="font-mono text-xs" aria-label={C.linkTitle} onFocus={(ev) => ev.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />{C.copyLink}</Button>
            <Button variant="outline" size="sm" asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />{C.viewProfile}</a></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm"><Share2 className="mr-2 h-4 w-4" />{C.share}</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {nativeShare && <DropdownMenuItem onClick={() => void navigator.share({ url: share }).catch(() => undefined)}>{C.share}…</DropdownMenuItem>}
                {targets.map(([name, href]) => (
                  <DropdownMenuItem key={name} asChild><a href={href} target="_blank" rel="noopener noreferrer">{name}</a></DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void copy(C.instagramHint)}><Instagram className="mr-2 h-4 w-4" />Instagram</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />{C.copyLink}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-xs text-muted-foreground">{C.instagramHint}</p>
        </>
      )}
    </section>
  );
}
