import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CalendarDays, Users, CreditCard, LayoutDashboard, Check, Menu, Maximize2, Link2, X, Youtube, Facebook, Globe, ListChecks, CircleUserRound, Euro, BarChart3 } from 'lucide-react';
import { BrandName } from '@/components/BrandName';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getStoredLang, setPreLoginLang } from '@/i18n/LanguageContext';
import type { AppLanguage } from '@/i18n/translations';
import { oc, soloFeatureKeys, type OfferKey } from '@/lib/landingOfferCopy';
import { SUBSCRIPTION_OFFER } from '@/lib/practiceAccess';
import { track } from '@/lib/analytics';
import calendarAsset from '@/assets/practice-calendar-overview.png.asset.json';
import ukrainianCalendarAsset from '@/assets/calendar-ukrainian-overview.png.asset.json';
import englishCalendarAsset from '@/assets/calendar-english-overview.png.asset.json';
import DemoWorkspace from '@/components/demo/DemoWorkspace';
import { publicDemoCopy } from '@/lib/publicDemoCopy';
const calendar = calendarAsset.url;
import { TrustSection } from '@/components/landing/TrustSection';
import { BILLING_PERIODS, PERIOD_DISCOUNT, periodPricing, type BillingPeriod } from '@/lib/subscriptionPricing';
import booking from '@/assets/booking-date-time-picker.png.asset.json';

const languages: AppLanguage[] = ['uk','en','pl','fr','ru'];
const screens = [
  { id: 'calendar', image: calendar, icon: CalendarDays },
  { id: 'clients', icon: Users },
  { id: 'payments', icon: CreditCard },
  { id: 'dashboard', icon: LayoutDashboard },
] as const;

export default function RedesignedLanding({ updatesOnly = false }: { updatesOnly?: boolean }) {
  const [lang, setLang] = useState<AppLanguage>(getStoredLang);
  const [mobile, setMobile] = useState(false);
  const [expanded, setExpanded] = useState<{image: string; title: string} | null>(null);
  const pricingRef = useRef<HTMLElement>(null);
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const eur = (n: number) => new Intl.NumberFormat(lang === 'en' ? 'en-IE' : lang, { style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol' }).format(n);
  const c = (key: OfferKey) => oc(lang, key);
  const eventProps = { locale: lang, redesign_version: '2026-11', source_page: '/' };
  useEffect(() => {
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (languages.includes(urlLang as AppLanguage)) { setPreLoginLang(urlLang as AppLanguage); setLang(urlLang as AppLanguage); }
    track('landing_view', { redesign_version: '2026-11' });
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { track('pricing_view', eventProps); observer.disconnect(); }
    }, { threshold: .2 });
    if (pricingRef.current) observer.observe(pricingRef.current);
    return () => observer.disconnect();
  }, [lang]);
  const expand = (image: string, title: string) => {
    setExpanded({image, title}); track('screenshot_expanded', { ...eventProps, module: title });
  };
  const trial = (source: string, plan?: string) => <Button asChild size="lg" className="h-auto min-h-12 whitespace-normal rounded-lg px-6 py-3 text-sm font-semibold"><Link to={`/auth?mode=signup&trial=1${plan ? `&preferred_plan=${plan}&billing_period=${period}` : ''}`} onClick={() => { if (plan) { try { localStorage.setItem('preferred_subscription', JSON.stringify({ plan, period })); } catch { /* ignore */ } } track('cta_clicked', {...eventProps, cta: source}); if (source === 'hero') track('hero_primary_cta_click', eventProps); }} >{c('trial')}<ArrowRight className="size-4 shrink-0" /></Link></Button>;
  const picture = (image: string, title: string, eager = false) => <Button variant="ghost" aria-label={`${c('expand')}: ${title}`} onClick={() => expand(image,title)} className="product-shot group relative block h-auto w-full overflow-hidden rounded-lg border bg-card p-0"><img src={image} alt={`Solo .Bizz — ${title}`} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} className="block h-auto w-full" /><span className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-lg border bg-card text-foreground shadow-card"><Maximize2 className="size-4" /></span></Button>;
  const navItems: OfferKey[] = ['features','how','pricing','updates'];
  const href = (key: OfferKey) => key === 'updates' ? '/updates' : `${updatesOnly ? '/' : ''}#${key}`;
  const title = `Solo .Bizz — ${c(updatesOnly ? 'updates' : 'audience')}`;
  const canonical = `https://solo-bizz.com/${updatesOnly ? 'updates' : ''}${lang === 'en' ? '' : `?lang=${lang}`}`;
  return <div className="offer-page min-h-screen bg-card text-foreground">
    <Helmet><title>{title}</title><meta name="description" content={c('intro')} /><meta property="og:title" content={title} /><meta property="og:description" content={c('intro')} /><meta property="og:type" content="website" /><meta property="og:url" content={canonical} /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content={title} /><meta name="twitter:description" content={c('intro')} /><link rel="canonical" href={canonical} />{languages.map(l => <link key={l} rel="alternate" hrefLang={l} href={`https://solo-bizz.com/${updatesOnly ? 'updates' : ''}${l === 'en' ? '' : `?lang=${l}`}`} />)}<link rel="alternate" hrefLang="x-default" href={`https://solo-bizz.com/${updatesOnly ? 'updates' : ''}`} /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" /></Helmet>
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm"><div className="offer-container flex min-h-20 items-center gap-5"><Link to="/" aria-label="Solo .Bizz"><BrandName className="text-2xl font-extrabold text-foreground" /></Link><nav className="ml-auto hidden items-center gap-6 xl:flex">{navItems.map(k => <Link className="text-sm font-medium hover:text-primary focus-visible:outline focus-visible:outline-primary" key={k} to={href(k)}>{c(k)}</Link>)}</nav><label className="ml-auto flex items-center gap-1 xl:ml-2"><Globe className="size-4" /><span className="sr-only">Language</span><select aria-label="Language" value={lang} onChange={e => { const next = e.target.value as AppLanguage; setPreLoginLang(next); setLang(next); const url = new URL(location.href); url.searchParams.set('lang',next); history.replaceState(null,'',url); }} className="w-12 bg-transparent text-xs font-semibold uppercase">{languages.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select></label><Button asChild variant="ghost" className="hidden rounded-lg md:inline-flex"><Link to="/auth">{c('login')}</Link></Button><div className="hidden lg:block">{trial('header')}</div><Button variant="ghost" size="icon" className="xl:hidden" aria-label={mobile ? 'Close menu' : 'Open menu'} onClick={() => setMobile(!mobile)}>{mobile ? <X /> : <Menu />}</Button></div>{mobile && <nav className="offer-container flex flex-col gap-4 pb-6 xl:hidden">{navItems.map(k => <Link key={k} to={href(k)} onClick={() => setMobile(false)}>{c(k)}</Link>)}<Link to="/auth">{c('login')}</Link>{trial('mobile')}</nav>}</header>
    {updatesOnly ? <main className="offer-container py-16"><p className="text-sm font-semibold text-primary">Solo .Bizz</p><h1 className="mt-3 text-4xl font-bold">{c('updates')}</h1><div className="mt-12 grid gap-12 md:grid-cols-3">{(['released','progress','planned'] as OfferKey[]).map((status,i) => <section key={status}><h2 className="border-b pb-4 text-xl font-bold">{c(status)}</h2>{(i === 0 ? ['calendar','payments','booking'] : i === 1 ? ['comingFeatures'] : []).map(k => <article key={k} className="border-b py-6"><h3 className="font-semibold">{c(k as OfferKey)}</h3><p className="mt-2 text-sm text-muted-foreground">{i === 0 ? c(k === 'booking' ? 'bookingTitle' : `${k}Body` as OfferKey) : c('soon')}</p></article>)}</section>)}</div></main> : <main>
      <section className="bg-secondary pt-10 text-secondary-foreground md:pt-14">
        <div className="offer-container text-center">
          <p className="text-xs font-bold uppercase text-primary">{c('audience')}</p>
          <div className="mx-auto mt-4 max-w-5xl">
            <p className="mb-3 text-lg font-semibold"><BrandName className="text-secondary-foreground" /></p>
            <h1 className="text-balance break-words text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">{c('headline')}</h1>
          </div>
          <p className="mx-auto mt-5 max-w-3xl text-pretty text-base leading-relaxed text-secondary-foreground/85 md:text-lg">{c('intro')}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{trial('hero')}<Button variant="outline" size="lg" asChild className="h-12 rounded-lg border-secondary-foreground/40 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"><a href="#pricing">{c('seePricing')}</a></Button></div>
          <p className="mt-4 text-xs text-secondary-foreground/75">{c('trialNote')}</p>
          <div className="mt-8 pb-8 md:mt-10 md:pb-10"><div className="overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl">{lang === 'uk' || lang === 'en' ? picture(lang === 'uk' ? ukrainianCalendarAsset.url : englishCalendarAsset.url, c('calendar'), true) : <DemoWorkspace embeddedModule="calendar" />}</div></div>
        </div>
      </section>
      <section id="features" aria-label={c('features')} className="scroll-mt-24 border-b bg-background">
        <ul className="offer-container grid grid-cols-1 py-5 text-foreground sm:grid-cols-3 sm:py-7">
          {([{key:'lessRoutine',icon:ListChecks},{key:'clearPayments',icon:CreditCard},{key:'clientBookingLink',icon:Link2}] as const).map(({key,icon:Icon},i) => <li key={key} className={`flex min-w-0 items-center justify-center gap-3 px-4 py-3 text-center text-sm font-semibold md:text-base ${i > 0 ? 'border-t border-border sm:border-l sm:border-t-0' : ''}`}><Icon aria-hidden="true" className="size-6 shrink-0 text-primary" /><span>{c(key)}</span></li>)}
        </ul>
      </section>
      <section id="how" className="scroll-mt-24 border-y bg-muted/50 py-16"><div className="offer-container"><h2 className="text-center text-3xl font-bold">{c('how')}</h2><div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{[Link2,Check,CircleUserRound,CreditCard,Euro,BarChart3].map((Icon,i) => <div key={i} className="flex h-full min-w-0 flex-col items-center justify-center gap-4 rounded-xl border bg-card px-3 py-7 text-center"><span className="flex size-12 items-center justify-center rounded-full bg-primary/10"><Icon className="size-5 text-primary" /></span><h3 className="text-sm font-semibold text-foreground">{c(`flow${i+1}` as OfferKey)}</h3></div>)}</div></div></section>
      <section className="offer-container grid items-center gap-10 py-16 md:grid-cols-2 md:py-24"><div><Link2 className="mb-5 size-7 text-primary" /><p className="text-xs font-bold uppercase text-primary">{c('booking')}</p><h2 className="mt-3 text-3xl font-bold leading-tight">{c('bookingTitle')}</h2><ol className="mt-7 space-y-4">{c('bookingSteps').split('|').map((step,i) => <li key={step} className="flex gap-3 text-sm"><span className="font-bold text-primary">0{i+1}</span>{step}</li>)}</ol><Button variant="outline" className="mt-7 rounded-lg" asChild><a href="https://solo-bizz.com/book/olgastelmakh" target="_blank" rel="noopener noreferrer" onClick={() => track('public_booking_demo_interaction',eventProps)}>{c('bookingDemo')}<ArrowRight className="size-4" /></a></Button></div>{picture(booking.url,c('booking'))}</section>
      <TrustSection lang={lang} />
      <section id="pricing" ref={pricingRef} className="scroll-mt-24 border-y bg-background py-16 md:py-24"><div className="offer-container"><div className="text-center"><h2 className="text-3xl font-bold md:text-4xl">{c('pricingTitle')}</h2><p className="mt-4 text-sm text-muted-foreground">{c('trialNote')}</p></div><div role="radiogroup" aria-label={c('billingPeriod')} className="mx-auto mt-8 flex w-fit flex-wrap justify-center gap-1 rounded-lg border bg-muted p-1">{BILLING_PERIODS.map(p => <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => { setPeriod(p); }} className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{c(p === 'monthly' ? 'billMonthly' : p === 'quarterly' ? 'billQuarterly' : 'billYearly')}{PERIOD_DISCOUNT[p] > 0 && <span className="ml-1.5 text-primary">−{PERIOD_DISCOUNT[p]}%</span>}</button>)}</div><div className="mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-2">{(['solo','pro'] as const).map(plan => <article key={plan} className={`flex flex-col rounded-lg border bg-card p-7 ${plan === 'pro' ? 'border-primary' : 'border-border'}`}><div className="flex justify-between"><h3 className="text-2xl font-bold">{plan === 'solo' ? 'Solo' : 'Pro'}</h3>{plan === 'pro' && <span className="text-xs font-bold text-primary">{c('features')}</span>}</div><p className="mt-3 text-sm text-muted-foreground">{c(`${plan}Desc`)}</p>{(() => { const pr = periodPricing(SUBSCRIPTION_OFFER[plan], period); return <div className="my-6"><p className="flex flex-wrap items-baseline gap-2"><span className="text-5xl font-bold">{eur(pr.total)}</span><span className="text-sm text-muted-foreground">{c(period === 'monthly' ? 'month' : period === 'quarterly' ? 'per3' : 'per12')}</span>{pr.discount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">−{pr.discount}%</span>}</p>{pr.discount > 0 && <><p className="mt-2 text-sm text-muted-foreground"><s>{eur(pr.original)}</s> · {c('savings')} {eur(pr.savings)}</p><p className="mt-1 text-xs text-muted-foreground">{c('equivalent')} {eur(pr.perMonth)}{c('month')}</p></>}</div>; })()}<ul className="mb-8 flex-1 space-y-3">{(plan === 'solo' ? c('soloFeatures').split('|') : c('proFeatures').split('|')).map(f => <li key={f} className="flex gap-3 text-sm"><Check className="size-4 shrink-0 text-success" />{f}</li>)}</ul>{trial(`pricing_${plan}`,plan)}{plan === 'pro' && <div className="mt-5 border-t pt-4 text-xs text-muted-foreground"><strong className="text-primary">{c('soon')}</strong><p className="mt-2">{c('comingFeatures')}</p></div>}</article>)}</div><p className="mt-5 text-center text-xs text-muted-foreground">{c('tax')}</p><Accordion type="single" collapsible className="mx-auto mt-8 max-w-4xl"><AccordionItem value="compare"><AccordionTrigger>{c('compare')}</AccordionTrigger><AccordionContent><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3">{c('features')}</th><th>Solo</th><th>Pro</th></tr></thead><tbody>{[...soloFeatureKeys.map(k => ({label:c(k),solo:true})),...c('proFeatures').split('|').slice(1).map(label => ({label,solo:false}))].map(row => <tr key={row.label} className="border-b"><td className="py-3 pr-4">{row.label}</td><td>{row.solo ? '✓' : '—'}</td><td>✓</td></tr>)}</tbody></table></AccordionContent></AccordionItem></Accordion></div></section>
      <section className="offer-container max-w-4xl py-16 md:py-24"><h2 className="mb-7 text-3xl font-bold">{c('faq')}</h2><Accordion type="single" collapsible>{Array.from({length:6},(_,i) => <AccordionItem key={i} value={`faq${i}`}><AccordionTrigger className="text-left">{c(`q${i+1}` as OfferKey)}</AccordionTrigger><AccordionContent className="text-muted-foreground leading-relaxed">{c(`a${i+1}` as OfferKey)}</AccordionContent></AccordionItem>)}</Accordion></section>
    </main>}
    <footer className="bg-secondary py-12 text-secondary-foreground"><div className="offer-container"><div className="flex flex-wrap items-start justify-between gap-8"><div><BrandName className="text-2xl font-bold text-secondary-foreground" /><p className="mt-4 max-w-sm text-sm text-secondary-foreground/70">{c('soloDesc')}</p></div><address className="space-y-2 text-sm not-italic"><a href="mailto:info@solo-bizz.com" className="block hover:text-primary">info@solo-bizz.com</a><a href="tel:+48572600256" className="block">+48 572 600 256</a><p>Wrocław, Gwiaździsta 16</p><p>Львів, Червоної калини, 46</p></address><div className="flex gap-3"><Button asChild size="icon" variant="outline" className="rounded-lg bg-transparent text-secondary-foreground"><a aria-label="YouTube" href="https://www.youtube.com/@OneBizz_SoloBizz" target="_blank" rel="noopener noreferrer"><Youtube /></a></Button><Button asChild size="icon" variant="outline" className="rounded-lg bg-transparent text-secondary-foreground"><a aria-label="Facebook" href="https://www.facebook.com/profile.php?id=61589480870290" target="_blank" rel="noopener noreferrer"><Facebook /></a></Button></div></div><div className="mt-10 flex flex-wrap items-center justify-between gap-5 border-t border-secondary-foreground/20 pt-6"><p className="text-xs text-secondary-foreground/60">© 2026 Solo .Bizz</p><nav className="flex flex-wrap gap-5 text-xs">{(['privacy','terms','refund'] as OfferKey[]).map(k => <Link key={k} to={k === 'refund' ? '/refund-policy' : `/${k}`} className="hover:text-primary">{c(k)}</Link>)}<Link to="/cookie-policy">Cookies</Link><Link to="/updates">{c('updates')}</Link><Button variant="link" className="h-auto p-0 text-xs text-secondary-foreground" onClick={() => window.dispatchEvent(new CustomEvent('cookie_consent_open'))}>Cookies ⚙</Button></nav></div></div></footer>
    <Dialog open={!!expanded} onOpenChange={open => { if (!open) setExpanded(null); }}><DialogContent className="max-w-[96vw] rounded-lg p-4"><DialogTitle>{expanded?.title}</DialogTitle>{expanded && <div className="overflow-auto"><img src={expanded.image} alt={`Solo .Bizz — ${expanded.title}`} className="max-h-[80dvh] min-w-[900px] object-contain" /></div>}</DialogContent></Dialog>
  </div>;
}