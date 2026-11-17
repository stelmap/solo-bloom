import { Copy, ExternalLink, Instagram, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const off = !url;
  const shown = slug ? profileUrl(slug) : "";
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{C.linkTitle}</p>
        {shown ? <p className={`truncate font-mono text-sm ${off ? "text-muted-foreground" : "text-foreground"}`} title={shown}>{shown}</p> : null}
        {off && <p className="text-xs text-muted-foreground">{C.publishToShare}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <Button variant="outline" size="sm" className="h-9" disabled={off} onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />{C.copyLink}</Button>
        {off ? <Button variant="outline" size="sm" className="h-9" disabled><ExternalLink className="mr-2 h-4 w-4" />{C.viewProfile}</Button>
          : <Button variant="outline" size="sm" className="h-9" asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />{C.viewProfile}</a></Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="sm" className="h-9" disabled={off}><Share2 className="mr-2 h-4 w-4" />{C.share}</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
    </section>
  );
}
