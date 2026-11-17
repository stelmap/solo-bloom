import { useEffect, useState } from "react";
import { CalendarCheck, FileText, Globe, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { richTextContentClass } from "@/components/RichTextEditor";
import { THERAPIST_FILES_BUCKET, TP_COPY, fullName, isSafeUrl, type TPLang, type TherapistProfileData } from "@/lib/therapistProfile";
import { cn } from "@/lib/utils";

/** Signed, short-lived URLs; storage rules decide who may read each file. */
export function useSignedUrls(paths: string[]) {
  const key = paths.join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!paths.length) { setUrls({}); return; }
    let on = true;
    void supabase.storage.from(THERAPIST_FILES_BUCKET).createSignedUrls(paths, 3600).then(({ data }) => {
      if (!on) return;
      const m: Record<string, string> = {};
      (data ?? []).forEach((d) => { if (d.path && d.signedUrl) m[d.path] = d.signedUrl; });
      setUrls(m);
    });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

export function TherapistProfileView({ profile, lang, onBook }: { profile: TherapistProfileData; lang: TPLang; onBook?: () => void }) {
  const C = TP_COPY[lang];
  const urls = useSignedUrls([profile.photo, ...profile.documents.map((d) => d.path)].filter(Boolean) as string[]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  useEffect(() => { if (api && openIdx !== null) api.scrollTo(openIdx, true); }, [api, openIdx]);
  const name = fullName(profile);
  const formats = [profile.online && C.online, profile.offline && C.offline].filter(Boolean).join(" / ");
  const hasHtml = (h: string) => h.replace(/<[^>]*>/g, "").trim().length > 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-5 text-center sm:flex-row sm:text-left">
        {profile.photo && urls[profile.photo] ? (
          <img src={urls[profile.photo]} alt={name} className="h-28 w-28 shrink-0 rounded-full border border-border object-cover" />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-muted"><UserRound className="h-10 w-10 text-muted-foreground" /></div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-2xl font-bold text-foreground">{name || "—"}</h2>
          {profile.title && <p className="font-medium text-primary">{profile.title}</p>}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start">
            {(profile.city || profile.address) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[profile.city, profile.address].filter(Boolean).join(", ")}</span>}
            {formats && <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{formats}</span>}
          </div>
        </div>
        {onBook && <Button size="lg" onClick={onBook} className="shrink-0"><CalendarCheck className="mr-2 h-4 w-4" />{C.book}</Button>}
      </section>

      {hasHtml(profile.about_html) && (
        <section className="space-y-2"><h3 className="text-lg font-semibold">{C.about}</h3>
          <div className={richTextContentClass} dangerouslySetInnerHTML={{ __html: profile.about_html }} /></section>
      )}
      {profile.expertise.length > 0 && (
        <section className="space-y-2"><h3 className="text-lg font-semibold">{C.expertise}</h3>
          <div className="flex flex-wrap gap-2">{profile.expertise.map((x) => <Badge key={x} variant="secondary" className="text-sm">{x}</Badge>)}</div></section>
      )}
      {hasHtml(profile.education_html) && (
        <section className="space-y-2"><h3 className="text-lg font-semibold">{C.education}</h3>
          <div className={richTextContentClass} dangerouslySetInnerHTML={{ __html: profile.education_html }} /></section>
      )}
      {profile.documents.length > 0 && (
        <section className="space-y-2"><h3 className="text-lg font-semibold">{C.documents}</h3>
          <Carousel opts={{ align: "start" }} className="mx-10">
            <CarouselContent>
              {profile.documents.map((d, i) => (
                <CarouselItem key={d.path} className="basis-1/2 sm:basis-1/3">
                  <button type="button" onClick={() => setOpenIdx(i)} aria-label={`${C.openDoc}: ${d.caption}`} className="block w-full overflow-hidden rounded-xl border border-border bg-card text-left hover:border-primary">
                    <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                      {d.kind === "image" && urls[d.path] ? <img src={urls[d.path]} alt={d.caption} className="h-full w-full object-cover" /> : <FileText className="h-10 w-10 text-muted-foreground" />}
                    </div>
                    {d.caption && <p className="truncate p-2 text-sm">{d.caption}</p>}
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious /><CarouselNext />
          </Carousel>
        </section>
      )}
      {(profile.email || profile.phone || profile.socials.length > 0) && (
        <section className="space-y-2"><h3 className="text-lg font-semibold">{C.contacts}</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            {profile.email && <a className="inline-flex items-center gap-1 hover:text-primary" href={`mailto:${profile.email}`}><Mail className="h-4 w-4" />{profile.email}</a>}
            {profile.phone && <a className="inline-flex items-center gap-1 hover:text-primary" href={`tel:${profile.phone.replace(/[^+\d]/g, "")}`}><Phone className="h-4 w-4" />{profile.phone}</a>}
            {profile.socials.filter((s) => isSafeUrl(s.url)).map((s) => <a key={s.url} className="text-primary underline" href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.label || s.url}</a>)}
          </div></section>
      )}
      {onBook && <div className="flex justify-center"><Button size="lg" onClick={onBook}><CalendarCheck className="mr-2 h-4 w-4" />{C.book}</Button></div>}

      <Dialog open={openIdx !== null} onOpenChange={(o) => !o && setOpenIdx(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{C.documents}</DialogTitle></DialogHeader>
          <Carousel setApi={setApi} className="mx-10">
            <CarouselContent>
              {profile.documents.map((d) => (
                <CarouselItem key={d.path} className="space-y-2">
                  <div className={cn("flex h-[65vh] items-center justify-center rounded-lg bg-muted")}>
                    {!urls[d.path] ? null : d.kind === "image"
                      ? <img src={urls[d.path]} alt={d.caption} className="max-h-full max-w-full object-contain" />
                      : <iframe src={urls[d.path]} title={d.caption || "PDF"} className="h-full w-full rounded-lg" />}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{d.caption}</span>
                    {urls[d.path] && <a href={urls[d.path]} target="_blank" rel="noopener noreferrer" className="text-primary underline">{C.openDoc}</a>}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious /><CarouselNext />
          </Carousel>
        </DialogContent>
      </Dialog>
    </div>
  );
}
