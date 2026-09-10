import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppLanguage } from "@/i18n/translations";
import psychologistImg from "@/assets/trust-psychologist.jpg";
import teacherImg from "@/assets/trust-teacher.jpg";
import consultantImg from "@/assets/trust-consultant.jpg";
import beautyImg from "@/assets/trust-beauty.jpg";

type Copy = {
  eyebrow: string;
  title: string;
  lead: string;
  audiences: string[];
  summaryLead: string;
  summaryFoot: string;
  verified: string;
  verifiedHint: string;
  ratingValue: string;
  ratingSource: string;
  prev: string;
  next: string;
  cards: { name: string; role: string; text: string; alt: string }[];
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
  ctaNote: string;
};

const IMAGES = [psychologistImg, teacherImg, consultantImg, beautyImg];

const COPY: Record<string, Copy> = {
  uk: {
    eyebrow: "ВІД ЛЮДЕЙ, ЯКІ ВЖЕ З SOLOBIZZ",
    title: "Довіра, підтверджена практикою",
    lead: "SoloBizz допомагає спеціалістам різних професій організовувати записи, клієнтів, оплати та щоденну роботу в одному місці.",
    audiences: ["Психологи", "Викладачі", "Консультанти", "Б’юті-фахівці"],
    summaryLead: "спеціалістів уже ведуть свою практику з SoloBizz",
    summaryFoot: "на основі відгуків користувачів",
    verified: "Підтверджений користувач",
    verifiedHint: "Відгук залишив користувач із підтвердженим акаунтом SoloBizz.",
    ratingValue: "4,9/5",
    ratingSource: "на основі відгуків користувачів SoloBizz",
    prev: "Попередній відгук",
    next: "Наступний відгук",
    cards: [
      {
        name: "Олена Л.", role: "Психолог",
        text: "«SoloBizz — це моя щоденна опора в роботі з клієнтами. Записи, оплати та нотатки зібрані в одному місці, тому я економлю час і можу більше зосередитися на своїй практиці.»",
        alt: "Психологиня спілкується з клієнткою у світлому кабінеті",
      },
      {
        name: "Дмитро П.", role: "Викладач",
        text: "«Я проводжу заняття онлайн і офлайн. SoloBizz допомагає мені контролювати розклад, оплати та комунікацію з учнями без окремих таблиць і календарів.»",
        alt: "Викладач готує онлайн-заняття за ноутбуком",
      },
      {
        name: "Ірина К.", role: "Консультант",
        text: "«Раніше я використовувала кілька різних інструментів для записів, клієнтів і оплат. Тепер уся інформація зібрана в SoloBizz, а щоденна робота стала набагато простішою.»",
        alt: "Консультантка обговорює розклад із клієнтами в офісі",
      },
      {
        name: "Анна В.", role: "Б’юті-фахівець",
        text: "«Мені важливо бачити всі записи, нагадування та історію візитів в одному місці. SoloBizz допомагає уникати плутанини й приділяти більше часу клієнтам.»",
        alt: "Б’юті-фахівчиня працює з клієнткою у світлій студії",
      },
    ],
    ctaTitle: "Збережіть до 6 годин на тиждень",
    ctaText: "Почніть безкоштовно за 5 хвилин",
    ctaButton: "Почати безкоштовно",
    ctaNote: "Банківська картка не потрібна",
  },
  en: {
    eyebrow: "FROM PEOPLE ALREADY ON SOLOBIZZ",
    title: "Trust proven in practice",
    lead: "SoloBizz helps professionals across different fields organise bookings, clients, payments and daily work in one place.",
    audiences: ["Psychologists", "Teachers", "Consultants", "Beauty specialists"],
    summaryLead: "professionals already run their practice with SoloBizz",
    summaryFoot: "based on user reviews",
    verified: "Verified user",
    verifiedHint: "The review was left by a user with a confirmed SoloBizz account.",
    ratingValue: "4.9/5",
    ratingSource: "based on SoloBizz user feedback",
    prev: "Previous review",
    next: "Next review",
    cards: [
      { name: "Olena L.", role: "Psychologist", text: "“SoloBizz is my daily support in client work. Bookings, payments and notes are in one place, so I save time and focus on my practice.”", alt: "Psychologist talking with a client in a bright consulting room" },
      { name: "Dmytro P.", role: "Teacher", text: "“I teach online and offline. SoloBizz helps me manage my schedule, payments and communication with students without separate spreadsheets.”", alt: "Teacher preparing an online lesson at a laptop" },
      { name: "Iryna K.", role: "Consultant", text: "“I used several different tools for bookings, clients and payments. Now everything lives in SoloBizz and daily work is far simpler.”", alt: "Consultant reviewing a schedule with clients in an office" },
      { name: "Anna V.", role: "Beauty specialist", text: "“I need to see all bookings, reminders and visit history in one place. SoloBizz helps me avoid confusion and give clients more time.”", alt: "Beauty specialist working with a client in a bright studio" },
    ],
    ctaTitle: "Save up to 6 hours a week",
    ctaText: "Start free in 5 minutes",
    ctaButton: "Start for free",
    ctaNote: "No credit card required",
  },
  pl: {
    eyebrow: "OD OSÓB, KTÓRE JUŻ SĄ Z SOLOBIZZ",
    title: "Zaufanie potwierdzone praktyką",
    lead: "SoloBizz pomaga specjalistom różnych zawodów organizować wizyty, klientów, płatności i codzienną pracę w jednym miejscu.",
    audiences: ["Psycholodzy", "Wykładowcy", "Konsultanci", "Specjaliści beauty"],
    summaryLead: "specjalistów prowadzi już praktykę z SoloBizz",
    summaryFoot: "na podstawie opinii użytkowników",
    verified: "Zweryfikowany użytkownik",
    verifiedHint: "Opinię wystawił użytkownik z potwierdzonym kontem SoloBizz.",
    ratingValue: "4,9/5",
    ratingSource: "na podstawie opinii użytkowników SoloBizz",
    prev: "Poprzednia opinia",
    next: "Następna opinia",
    cards: [
      { name: "Olena L.", role: "Psycholożka", text: "„SoloBizz to moje codzienne wsparcie w pracy z klientami. Wizyty, płatności i notatki są w jednym miejscu, więc oszczędzam czas.”", alt: "Psycholożka rozmawia z klientką w jasnym gabinecie" },
      { name: "Dmytro P.", role: "Wykładowca", text: "„Prowadzę zajęcia online i offline. SoloBizz pomaga mi kontrolować grafik, płatności i kontakt z uczniami bez osobnych arkuszy.”", alt: "Wykładowca przygotowuje lekcję online przy laptopie" },
      { name: "Iryna K.", role: "Konsultantka", text: "„Wcześniej używałam kilku narzędzi do wizyt, klientów i płatności. Teraz wszystko jest w SoloBizz, a praca stała się prostsza.”", alt: "Konsultantka omawia grafik z klientami w biurze" },
      { name: "Anna W.", role: "Specjalistka beauty", text: "„Ważne jest dla mnie, by widzieć wizyty, przypomnienia i historię w jednym miejscu. SoloBizz pomaga uniknąć chaosu.”", alt: "Specjalistka beauty pracuje z klientką w jasnym studiu" },
    ],
    ctaTitle: "Oszczędź do 6 godzin tygodniowo",
    ctaText: "Zacznij za darmo w 5 minut",
    ctaButton: "Zacznij za darmo",
    ctaNote: "Karta płatnicza nie jest potrzebna",
  },
  fr: {
    eyebrow: "DE CEUX QUI SONT DÉJÀ SUR SOLOBIZZ",
    title: "Une confiance confirmée par la pratique",
    lead: "SoloBizz aide des professionnels de différents métiers à organiser rendez-vous, clients, paiements et travail quotidien au même endroit.",
    audiences: ["Psychologues", "Enseignants", "Consultants", "Professionnels beauté"],
    summaryLead: "professionnels gèrent déjà leur activité avec SoloBizz",
    summaryFoot: "sur la base des avis utilisateurs",
    verified: "Utilisateur vérifié",
    verifiedHint: "L’avis a été laissé par un utilisateur au compte SoloBizz confirmé.",
    ratingValue: "4,9/5",
    ratingSource: "sur la base des avis des utilisateurs SoloBizz",
    prev: "Avis précédent",
    next: "Avis suivant",
    cards: [
      { name: "Olena L.", role: "Psychologue", text: "« SoloBizz est mon appui quotidien. Rendez-vous, paiements et notes au même endroit : je gagne du temps pour ma pratique. »", alt: "Psychologue en échange avec une cliente dans un cabinet lumineux" },
      { name: "Dmytro P.", role: "Enseignant", text: "« J'enseigne en ligne et en présentiel. SoloBizz m'aide à gérer planning, paiements et communication sans tableurs séparés. »", alt: "Enseignant préparant un cours en ligne sur un ordinateur portable" },
      { name: "Iryna K.", role: "Consultante", text: "« J'utilisais plusieurs outils différents. Tout est désormais réuni dans SoloBizz et mon quotidien est bien plus simple. »", alt: "Consultante examinant un planning avec des clients au bureau" },
      { name: "Anna V.", role: "Professionnelle beauté", text: "« Voir tous les rendez-vous, rappels et historiques au même endroit m'évite la confusion et me laisse plus de temps. »", alt: "Professionnelle beauté avec une cliente dans un studio lumineux" },
    ],
    ctaTitle: "Gagnez jusqu'à 6 heures par semaine",
    ctaText: "Commencez gratuitement en 5 minutes",
    ctaButton: "Commencer gratuitement",
    ctaNote: "Aucune carte bancaire requise",
  },
  ru: {
    eyebrow: "ОТ ЛЮДЕЙ, КОТОРЫЕ УЖЕ С SOLOBIZZ",
    title: "Доверие, подтверждённое практикой",
    lead: "SoloBizz помогает специалистам разных профессий организовывать записи, клиентов, оплаты и ежедневную работу в одном месте.",
    audiences: ["Психологи", "Преподаватели", "Консультанты", "Бьюти-специалисты"],
    summaryLead: "специалистов уже ведут свою практику с SoloBizz",
    summaryFoot: "на основе отзывов пользователей",
    verified: "Подтверждённый пользователь",
    verifiedHint: "Отзыв оставил пользователь с подтверждённым аккаунтом SoloBizz.",
    ratingValue: "4,9/5",
    ratingSource: "на основе отзывов пользователей SoloBizz",
    prev: "Предыдущий отзыв",
    next: "Следующий отзыв",
    cards: [
      { name: "Елена Л.", role: "Психолог", text: "«SoloBizz — моя ежедневная опора в работе с клиентами. Записи, оплаты и заметки собраны в одном месте, я экономлю время.»", alt: "Психолог беседует с клиенткой в светлом кабинете" },
      { name: "Дмитрий П.", role: "Преподаватель", text: "«Я провожу занятия онлайн и офлайн. SoloBizz помогает контролировать расписание, оплаты и общение с учениками.»", alt: "Преподаватель готовит онлайн-занятие за ноутбуком" },
      { name: "Ирина К.", role: "Консультант", text: "«Раньше я использовала несколько инструментов. Теперь вся информация в SoloBizz, и ежедневная работа стала проще.»", alt: "Консультант обсуждает расписание с клиентами в офисе" },
      { name: "Анна В.", role: "Бьюти-специалист", text: "«Мне важно видеть все записи, напоминания и историю визитов в одном месте. SoloBizz помогает избегать путаницы.»", alt: "Бьюти-специалист работает с клиенткой в светлой студии" },
    ],
    ctaTitle: "Сэкономьте до 6 часов в неделю",
    ctaText: "Начните бесплатно за 5 минут",
    ctaButton: "Начать бесплатно",
    ctaNote: "Банковская карта не нужна",
  },
};

function Stars({ className = "" }: { className?: string }) {
  return (
    <span className={`tracking-widest ${className}`} aria-label="5/5">
      ★★★★★
    </span>
  );
}

export function TrustSection({
  lang,
  onCtaClick,
}: {
  lang: AppLanguage | string;
  onCtaClick?: () => void;
}) {
  const c = COPY[lang as string] ?? COPY.en;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    const first = el.querySelector<HTMLElement>("[data-slide]");
    const step = first ? first.offsetWidth + 20 : el.clientWidth || 1;
    setPage(Math.round(el.scrollLeft / step));
  }, []);

  useEffect(() => {
    syncEdges();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncEdges, { passive: true });
    window.addEventListener("resize", syncEdges);
    return () => {
      el.removeEventListener("scroll", syncEdges);
      window.removeEventListener("resize", syncEdges);
    };
  }, [syncEdges]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-slide]");
    const amount = first ? first.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section className="bg-muted/40 py-16 sm:py-20" style={{ paddingInline: "clamp(16px, 4vw, 64px)" }} aria-labelledby="trust-title">
      <div className="mx-auto w-full" style={{ width: "min(92vw, 1720px)", maxWidth: "100%" }}>
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">{c.eyebrow}</p>
          <h2 id="trust-title" className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {c.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{c.lead}</p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {c.audiences.map((a) => (
              <li
                key={a}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground"
              >
                {a}
              </li>
            ))}
          </ul>
        </header>

        {/* Social-proof summary */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-6 rounded-2xl border border-border bg-card px-6 py-6 text-center sm:flex-row sm:justify-center sm:gap-12">
          <div>
            <div className="text-4xl font-bold text-foreground sm:text-5xl">300+</div>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{c.summaryLead}</p>
          </div>
          <div className="hidden h-14 w-px bg-border sm:block" aria-hidden="true" />
          <div>
            <div className="flex items-center justify-center gap-2">
              <Stars className="text-primary" />
              <span className="text-2xl font-bold text-foreground">{c.ratingValue}</span>
            </div>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{c.ratingSource}</p>
          </div>
        </div>

        <div className="relative mt-10">
          {/* Reviews carousel */}
          <div className="relative min-w-0">
            <div
              ref={scrollerRef}
              className="invisible-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-hidden scroll-smooth pb-2 motion-reduce:scroll-auto"
            >
              {c.cards.map((card, i) => (
                <article
                  key={card.name}
                  data-slide
                  className="flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)]"
                >
                  <img
                    src={IMAGES[i]}
                    alt={card.alt}
                    width={800}
                    height={600}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <div className="flex flex-1 flex-col p-6">
                    <Stars className="mb-3 text-primary" />
                    <p className="flex-1 text-sm leading-relaxed text-foreground/90">{card.text}</p>
                    <div className="mt-5 border-t border-border pt-4">
                      <div className="text-sm font-semibold text-foreground">{card.name}</div>
                      <div className="text-xs text-muted-foreground">{card.role}</div>
                      <span
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
                        title={c.verifiedHint}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        {c.verified}
                        <span className="sr-only"> — {c.verifiedHint}</span>
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 lg:justify-end">
              <div className="flex items-center gap-1.5 lg:hidden" aria-hidden="true">
                {c.cards.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === page ? "w-6 bg-primary" : "w-2.5 bg-border"}`} />
                ))}
              </div>
              <button
                type="button"
                aria-label={c.prev}
                onClick={() => scrollBy(-1)}
                disabled={atStart}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={c.next}
                onClick={() => scrollBy(1)}
                disabled={atEnd}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-6 rounded-2xl border border-primary/20 bg-primary/5 p-7 text-center sm:p-9 md:flex-row md:items-center md:justify-between md:gap-10 md:text-left">
          <div className="md:max-w-xl">
            <h3 className="text-xl font-bold text-foreground sm:text-2xl">{c.ctaTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{c.ctaText}</p>
          </div>
          <div className="flex w-full flex-col items-center gap-2 md:w-auto md:shrink-0">
            <Link
              to="/auth?mode=signup"
              aria-disabled={submitting}
              onClick={(e) => {
                if (submitting) {
                  e.preventDefault();
                  return;
                }
                setSubmitting(true);
                onCtaClick?.();
              }}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 w-full gap-2 rounded-xl px-8 text-base font-semibold shadow-lg shadow-primary/25 md:w-auto",
                submitting && "pointer-events-none opacity-70",
              )}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {c.ctaButton}
              {submitting ? null : <ArrowRight className="h-4 w-4" />}
            </Link>
            <p className="text-xs text-muted-foreground">{c.ctaNote}</p>
          </div>
        </div>

      </div>
    </section>
  );
}
