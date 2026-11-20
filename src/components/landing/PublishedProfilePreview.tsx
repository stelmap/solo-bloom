import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { fullName, normalizeProfile, TP_COPY, type TherapistProfileData, type TPLang } from '@/lib/therapistProfile';
import { useSignedUrls } from '@/components/therapist/TherapistProfileView';

/** Only the published, publicly permitted snapshot is used; no owner draft is fetched. */
export function PublishedProfilePreview({ lang }: { lang: TPLang }) {
  const [profile, setProfile] = useState<TherapistProfileData | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.rpc('public_get_therapist_profile_by_slug', { p_slug: 'olga-stelmakh' }).then(({ data }) => {
      const published = data as { profile?: unknown } | null;
      if (active) setProfile(published?.profile ? normalizeProfile(published.profile) : null);
    });
    return () => { active = false; };
  }, []);
  const urls = useSignedUrls(profile?.photo ? [profile.photo] : []);
  if (!profile) return null;
  const C = TP_COPY[lang];
  const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return <article className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-card">
    <div className="flex items-center gap-4">
      {profile.photo && urls[profile.photo] && <img src={urls[profile.photo]} alt={fullName(profile)} className="size-20 shrink-0 rounded-full object-cover" />}
      <div className="min-w-0"><h3 className="text-xl font-bold">{fullName(profile)}</h3><p className="mt-1 text-sm text-primary">{profile.title}</p></div>
    </div>
    <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{plain(profile.about_html)}</p>
    {profile.education_html && <div className="mt-5 border-t border-border pt-4"><p className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="size-4 text-primary" />{C.education}</p><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{plain(profile.education_html)}</p></div>}
    <Button asChild className="mt-6 h-auto min-h-11 w-full whitespace-normal py-3"><Link to={`/therapist/olga-stelmakh?lang=${lang}`}><CalendarCheck className="size-4 shrink-0" />{C.viewProfile}</Link></Button>
  </article>;
}