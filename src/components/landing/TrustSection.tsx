import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, MessageSquare, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReviewDialog } from "@/components/landing/ReviewDialog";
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
  reviewCtaTitle: string;
  reviewCtaText: string;
  reviewCtaButton: string;
  replyLabel: string;
};

type DbReview = {
  id: string;
  display_name: string;
  profession: string;
  plan: string | null;
  rating: number;
  body: string;
  verification_status: string;
  published_at: string | null;
  created_at: string;
  admin_reply: string | null;
};

const PLAN_LABEL: Record<string, string> = {
  free_starter: "Free Starter",
  solo_practice: "Solo Practice",
  pro_practice: "Pro Practice",
};

const IMAGES = [psychologistImg, teacherImg, consultantImg, beautyImg];

const COPY: Record<string, Copy> = {
  uk: {
    eyebrow: "ВІД ЛЮДЕЙ, ЯКІ ВЖЕ З SOLOBIZZ",
    title: "Довіра, підтверджена практикою",
    lead: "Solo .Bizz допомагає спеціалістам різних професій організовувати записи, клієнтів, оплати та щоденну роботу в одному місці.",
    audiences: ["Психологи", "Викладачі", "Консультанти", "Б’юті-фахівці"],
    summaryLead: "спеціалістів уже ведуть свою практику з Solo .Bizz",
    summaryFoot: "на основі відгуків користувачів",
    verified: "Підтверджений користувач",
    verifiedHint: "Відгук залишив користувач із підтвердженим акаунтом Solo .Bizz.",
    ratingValue: "4,9/5",
    ratingSource: "на основі відгуків користувачів Solo .Bizz",
    prev: "Попередній відгук",
    next: "Наступний відгук",
    cards: [
      {
        name: "Олена Л.", role: "Психолог",
        text: "«Solo .Bizz — це моя щоденна опора в роботі з клієнтами. Записи, оплати та нотатки зібрані в одному місці, тому я економлю час і можу більше зосередитися на своїй практиці.»",
        alt: "Психологиня спілкується з клієнткою у світлому кабінеті",
      },
      {
        name: "Дмитро П.", role: "Викладач",
        text: "«Я проводжу заняття онлайн і офлайн. Solo .Bizz допомагає мені контролювати розклад, оплати та комунікацію з учнями без окремих таблиць і календарів.»",
        alt: "Викладач готує онлайн-заняття за ноутбуком",
      },
      {
        name: "Ірина К.", role: "Консультант",
        text: "«Раніше я використовувала кілька різних інструментів для записів, клієнтів і оплат. Тепер уся інформація зібрана в Solo .Bizz, а щоденна робота стала набагато простішою.»",
        alt: "Консультантка обговорює розклад із клієнтами в офісі",
      },
      {
        name: "Анна В.", role: "Б’юті-фахівець",
        text: "«Мені важливо бачити всі записи, нагадування та історію візитів в одному місці. Solo .Bizz допомагає уникати плутанини й приділяти більше часу клієнтам.»",
        alt: "Б’юті-фахівчиня працює з клієнткою у світлій студії",
      },
    ],
    ctaTitle: "Збережіть до 6 годин на тиждень",
    ctaText: "Почніть безкоштовно за 5 хвилин",
    ctaButton: "Почати безкоштовно",
    ctaNote: "Банківська картка не потрібна",
    reviewCtaTitle: "Вже користуєтесь Solo .Bizz?",
    reviewCtaText: "Поділіться своїм досвідом — ваш відгук допоможе іншим фахівцям.",
    reviewCtaButton: "Залишити відгук",
    replyLabel: "Відповідь Solo .Bizz",
  },
  en: {
    eyebrow: "FROM PEOPLE ALREADY ON SOLOBIZZ",
    title: "Trust proven in practice",
    lead: "Solo .Bizz helps professionals across different fields organise bookings, clients, payments and daily work in one place.",
    audiences: ["Psychologists", "Teachers", "Consultants", "Beauty specialists"],
    summaryLead: "professionals already run their practice with Solo .Bizz",
    summaryFoot: "based on user reviews",
    verified: "Verified user",
    verifiedHint: "The review was left by a user with a confirmed Solo .Bizz account.",
    ratingValue: "4.9/5",
    ratingSource: "based on Solo .Bizz user feedback",
    prev: "Previous review",
    next: "Next review",
    cards: [
      { name: "Olena L.", role: "Psychologist", text: "“Solo .Bizz is my daily support in client work. Bookings, payments and notes are in one place, so I save time and focus on my practice.”", alt: "Psychologist talking with a client in a bright consulting room" },
      { name: "Dmytro P.", role: "Teacher", text: "“I teach online and offline. Solo .Bizz helps me manage my schedule, payments and communication with students without separate spreadsheets.”", alt: "Teacher preparing an online lesson at a laptop" },
      { name: "Iryna K.", role: "Consultant", text: "“I used several different tools for bookings, clients and payments. Now everything lives in Solo .Bizz and daily work is far simpler.”", alt: "Consultant reviewing a schedule with clients in an office" },
      { name: "Anna V.", role: "Beauty specialist", text: "“I need to see all bookings, reminders and visit history in one place. Solo .Bizz helps me avoid confusion and give clients more time.”", alt: "Beauty specialist working with a client in a bright studio" },
    ],
    ctaTitle: "Save up to 6 hours a week",
    ctaText: "Start free in 5 minutes",
    ctaButton: "Start for free",
    ctaNote: "No credit card required",
    reviewCtaTitle: "Already using Solo .Bizz?",
    reviewCtaText: "Share your experience — your review will help other professionals.",
    reviewCtaButton: "Leave a review",
    replyLabel: "Solo .Bizz reply",
  },
  pl: {
    eyebrow: "OD OSÓB, KTÓRE JUŻ SĄ Z SOLOBIZZ",
    title: "Zaufanie potwierdzone praktyką",
    lead: "Solo .Bizz pomaga specjalistom różnych zawodów organizować wizyty, klientów, płatności i codzienną pracę w jednym miejscu.",
    audiences: ["Psycholodzy", "Wykładowcy", "Konsultanci", "Specjaliści beauty"],
    summaryLead: "specjalistów prowadzi już praktykę z Solo .Bizz",
    summaryFoot: "na podstawie opinii użytkowników",
    verified: "Zweryfikowany użytkownik",
    verifiedHint: "Opinię wystawił użytkownik z potwierdzonym kontem Solo .Bizz.",
    ratingValue: "4,9/5",
    ratingSource: "na podstawie opinii użytkowników Solo .Bizz",
    prev: "Poprzednia opinia",
    next: "Następna opinia",
    cards: [
      { name: "Olena L.", role: "Psycholożka", text: "„Solo .Bizz to moje codzienne wsparcie w pracy z klientami. Wizyty, płatności i notatki są w jednym miejscu, więc oszczędzam czas.”", alt: "Psycholożka rozmawia z klientką w jasnym gabinecie" },
      { name: "Dmytro P.", role: "Wykładowca", text: "„Prowadzę zajęcia online i offline. Solo .Bizz pomaga mi kontrolować grafik, płatności i kontakt z uczniami bez osobnych arkuszy.”", alt: "Wykładowca przygotowuje lekcję online przy laptopie" },
      { name: "Iryna K.", role: "Konsultantka", text: "„Wcześniej używałam kilku narzędzi do wizyt, klientów i płatności. Teraz wszystko jest w Solo .Bizz, a praca stała się prostsza.”", alt: "Konsultantka omawia grafik z klientami w biurze" },
      { name: "Anna W.", role: "Specjalistka beauty", text: "„Ważne jest dla mnie, by widzieć wizyty, przypomnienia i historię w jednym miejscu. Solo .Bizz pomaga uniknąć chaosu.”", alt: "Specjalistka beauty pracuje z klientką w jasnym studiu" },
    ],
    ctaTitle: "Oszczędź do 6 godzin tygodniowo",
    ctaText: "Zacznij za darmo w 5 minut",
    ctaButton: "Zacznij za darmo",
    ctaNote: "Karta płatnicza nie jest potrzebna",
    reviewCtaTitle: "Korzystasz już z Solo .Bizz?",
    reviewCtaText: "Podziel się doświadczeniem — Twoja opinia pomoże innym specjalistom.",
    reviewCtaButton: "Zostaw opinię",
    replyLabel: "Odpowiedź Solo .Bizz",
  },
  fr: {
    eyebrow: "DE CEUX QUI SONT DÉJÀ SUR SOLOBIZZ",
    title: "Une confiance confirmée par la pratique",
    lead: "Solo .Bizz aide des professionnels de différents métiers à organiser rendez-vous, clients, paiements et travail quotidien au même endroit.",
    audiences: ["Psychologues", "Enseignants", "Consultants", "Professionnels beauté"],
    summaryLead: "professionnels gèrent déjà leur activité avec Solo .Bizz",
    summaryFoot: "sur la base des avis utilisateurs",
    verified: "Utilisateur vérifié",
    verifiedHint: "L’avis a été laissé par un utilisateur au compte Solo .Bizz confirmé.",
    ratingValue: "4,9/5",
    ratingSource: "sur la base des avis des utilisateurs Solo .Bizz",
    prev: "Avis précédent",
    next: "Avis suivant",
    cards: [
      { name: "Olena L.", role: "Psychologue", text: "« Solo .Bizz est mon appui quotidien. Rendez-vous, paiements et notes au même endroit : je gagne du temps pour ma pratique. »", alt: "Psychologue en échange avec une cliente dans un cabinet lumineux" },
      { name: "Dmytro P.", role: "Enseignant", text: "« J'enseigne en ligne et en présentiel. Solo .Bizz m'aide à gérer planning, paiements et communication sans tableurs séparés. »", alt: "Enseignant préparant un cours en ligne sur un ordinateur portable" },
      { name: "Iryna K.", role: "Consultante", text: "« J'utilisais plusieurs outils différents. Tout est désormais réuni dans Solo .Bizz et mon quotidien est bien plus simple. »", alt: "Consultante examinant un planning avec des clients au bureau" },
      { name: "Anna V.", role: "Professionnelle beauté", text: "« Voir tous les rendez-vous, rappels et historiques au même endroit m'évite la confusion et me laisse plus de temps. »", alt: "Professionnelle beauté avec une cliente dans un studio lumineux" },
    ],
    ctaTitle: "Gagnez jusqu'à 6 heures par semaine",
    ctaText: "Commencez gratuitement en 5 minutes",
    ctaButton: "Commencer gratuitement",
    ctaNote: "Aucune carte bancaire requise",
    reviewCtaTitle: "Vous utilisez déjà Solo .Bizz ?",
    reviewCtaText: "Partagez votre expérience — votre avis aidera d’autres professionnels.",
    reviewCtaButton: "Laisser un avis",
    replyLabel: "Réponse Solo .Bizz",
  },
  ru: {
    eyebrow: "ОТ ЛЮДЕЙ, КОТОРЫЕ УЖЕ С SOLOBIZZ",
    title: "Доверие, подтверждённое практикой",
    lead: "Solo .Bizz помогает специалистам разных профессий организовывать записи, клиентов, оплаты и ежедневную работу в одном месте.",
    audiences: ["Психологи", "Преподаватели", "Консультанты", "Бьюти-специалисты"],
    summaryLead: "специалистов уже ведут свою практику с Solo .Bizz",
    summaryFoot: "на основе отзывов пользователей",
    verified: "Подтверждённый пользователь",
    verifiedHint: "Отзыв оставил пользователь с подтверждённым аккаунтом Solo .Bizz.",
    ratingValue: "4,9/5",
    ratingSource: "на основе отзывов пользователей Solo .Bizz",
    prev: "Предыдущий отзыв",
    next: "Следующий отзыв",
    cards: [
      { name: "Елена Л.", role: "Психолог", text: "«Solo .Bizz — моя ежедневная опора в работе с клиентами. Записи, оплаты и заметки собраны в одном месте, я экономлю время.»", alt: "Психолог беседует с клиенткой в светлом кабинете" },
      { name: "Дмитрий П.", role: "Преподаватель", text: "«Я провожу занятия онлайн и офлайн. Solo .Bizz помогает контролировать расписание, оплаты и общение с учениками.»", alt: "Преподаватель готовит онлайн-занятие за ноутбуком" },
      { name: "Ирина К.", role: "Консультант", text: "«Раньше я использовала несколько инструментов. Теперь вся информация в Solo .Bizz, и ежедневная работа стала проще.»", alt: "Консультант обсуждает расписание с клиентами в офисе" },
      { name: "Анна В.", role: "Бьюти-специалист", text: "«Мне важно видеть все записи, напоминания и историю визитов в одном месте. Solo .Bizz помогает избегать путаницы.»", alt: "Бьюти-специалист работает с клиенткой в светлой студии" },
    ],
    ctaTitle: "Сэкономьте до 6 часов в неделю",
    ctaText: "Начните бесплатно за 5 минут",
    ctaButton: "Начать бесплатно",
    ctaNote: "Банковская карта не нужна",
    reviewCtaTitle: "Уже пользуетесь Solo .Bizz?",
    reviewCtaText: "Поделитесь своим опытом — ваш отзыв поможет другим специалистам.",
    reviewCtaButton: "Оставить отзыв",
    replyLabel: "Ответ Solo .Bizz",
  },
};

function Stars({ className = "", value = 5 }: { className?: string; value?: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={`tracking-widest ${className}`} aria-label={`${filled}/5`}>
      {"★".repeat(filled)}
      <span className="text-muted-foreground/30">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

export function TrustSection({
  lang,
}: {
  lang: AppLanguage | string;
  onCtaClick?: () => void;
}) {
  const c = COPY[lang as string] ?? COPY.en;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [page, setPage] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviews, setReviews] = useState<DbReview[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("reviews")
      .select("id, display_name, profession, plan, rating, body, verification_status, published_at, created_at, admin_reply")
      .eq("moderation_status", "approved")
      .order("published_at", { ascending: false })
      .limit(24)
      .then(({ data }) => {
        if (!cancelled && data) setReviews(data as DbReview[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const slideCount = c.cards.length + reviews.length;

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
    <section id="reviews" className="bg-muted/40 py-16 sm:py-20" style={{ paddingInline: "clamp(16px, 4vw, 64px)" }} aria-labelledby="trust-title">
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

              {reviews.map((r) => (
                <article
                  key={r.id}
                  data-slide
                  className="flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)]"
                >
                  <div className="flex flex-1 flex-col p-6">
                    <Stars className="mb-3 text-primary" value={r.rating} />
                    <p className="flex-1 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{r.body}</p>
                    {r.admin_reply ? (
                      <div className="mt-4 rounded-xl bg-muted/60 p-4">
                        <div className="text-xs font-semibold text-foreground">{c.replyLabel}</div>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{r.admin_reply}</p>
                      </div>
                    ) : null}
                    <div className="mt-5 border-t border-border pt-4">
                      <div className="text-sm font-semibold text-foreground">{r.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.profession}
                        {r.plan && PLAN_LABEL[r.plan] ? ` · ${PLAN_LABEL[r.plan]}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.published_at ?? r.created_at).toLocaleDateString(
                          lang === "uk" ? "uk-UA" : (lang as string),
                          { year: "numeric", month: "long" },
                        )}
                      </div>
                      {r.verification_status === "verified_user" ? (
                        <span
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
                          title={c.verifiedHint}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          {c.verified}
                          <span className="sr-only"> — {c.verifiedHint}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 lg:justify-end">
              <div className="flex items-center gap-1.5 lg:hidden" aria-hidden="true">
                {Array.from({ length: slideCount }).map((_, i) => (
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

        {/* Leave a review CTA */}
        <div className="mt-8 flex flex-col items-center gap-5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 text-center sm:p-8 md:flex-row md:items-center md:justify-between md:gap-10 md:text-left">
          <div className="md:max-w-xl">
            <h3 className="text-lg font-bold text-foreground sm:text-xl">{c.reviewCtaTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.reviewCtaText}</p>
          </div>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-primary bg-background px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-auto"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {c.reviewCtaButton}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} lang={lang as string} />


      </div>
    </section>
  );
}
