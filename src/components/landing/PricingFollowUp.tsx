import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Headphones, ShieldCheck, SlidersHorizontal, Tag } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import type { AppLanguage } from "@/i18n/translations";
import { track } from "@/lib/analytics";
import { landingEventProps } from "@/lib/landingCampaign";

type L = Partial<Record<AppLanguage, string>> & { en: string };
const p = (lang: AppLanguage, m: L) => m[lang] ?? m.en;

const BENEFITS: { icon: typeof Tag; title: L; text: L }[] = [
  {
    icon: Tag,
    title: { en: "Transparent pricing", uk: "Прозорі ціни", pl: "Przejrzyste ceny", fr: "Tarifs transparents", ru: "Прозрачные цены" },
    text: { en: "No hidden fees", uk: "Без прихованих платежів", pl: "Bez ukrytych opłat", fr: "Sans frais cachés", ru: "Без скрытых платежей" },
  },
  {
    icon: SlidersHorizontal,
    title: { en: "Flexible plan changes", uk: "Гнучка зміна плану", pl: "Elastyczna zmiana planu", fr: "Changement de forfait flexible", ru: "Гибкая смена плана" },
    text: {
      en: "Upgrade or cancel at any time",
      uk: "Оновлюйте або скасовуйте в будь-який момент",
      pl: "Zmieniaj lub anuluj w dowolnym momencie",
      fr: "Changez ou annulez à tout moment",
      ru: "Обновляйте или отменяйте в любой момент",
    },
  },
  {
    icon: ShieldCheck,
    title: { en: "Your data is protected", uk: "Ваші дані захищені", pl: "Twoje dane są chronione", fr: "Vos données sont protégées", ru: "Ваши данные защищены" },
    text: { en: "GDPR compliant", uk: "Відповідність GDPR", pl: "Zgodność z RODO", fr: "Conformité RGPD", ru: "Соответствие GDPR" },
  },
  {
    icon: Headphones,
    title: { en: "Support in Ukrainian", uk: "Підтримка українською", pl: "Wsparcie po ukraińsku", fr: "Assistance en ukrainien", ru: "Поддержка на украинском" },
    text: { en: "Fast and to the point", uk: "Швидко та по суті", pl: "Szybko i na temat", fr: "Rapide et efficace", ru: "Быстро и по сути" },
  },
];

const FAQ: { q: L; a: L }[] = [
  {
    q: {
      en: "Do all plans include the calendar and client booking?",
      uk: "Чи всі плани включають календар і запис клієнтів?",
      pl: "Czy wszystkie plany obejmują kalendarz i zapisy klientów?",
      fr: "Tous les forfaits incluent-ils l'agenda et la réservation clients ?",
      ru: "Все ли планы включают календарь и запись клиентов?",
    },
    a: {
      en: "Yes. The calendar and client booking are available on every plan. Plans differ only in the number of active clients and the extra features available.",
      uk: "Так. Календар і можливість створювати записи клієнтів доступні в усіх тарифах. Обмеження тарифів залежать від кількості активних клієнтів та доступного додаткового функціоналу.",
      pl: "Tak. Kalendarz i zapisy klientów są dostępne w każdym planie. Plany różnią się liczbą aktywnych klientów i dodatkowymi funkcjami.",
      fr: "Oui. L'agenda et la réservation clients sont inclus dans tous les forfaits. Les forfaits diffèrent par le nombre de clients actifs et les fonctionnalités supplémentaires.",
      ru: "Да. Календарь и возможность создавать записи клиентов доступны во всех тарифах. Отличия тарифов зависят от количества активных клиентов и дополнительного функционала.",
    },
  },
  {
    q: {
      en: "How do the plans differ?",
      uk: "Чим відрізняються тарифні плани?",
      pl: "Czym różnią się plany?",
      fr: "Quelles sont les différences entre les forfaits ?",
      ru: "Чем отличаются тарифные планы?",
    },
    a: {
      en: "Plans differ in the number of active clients and the features available for managing your practice, finances, documents and other processes.",
      uk: "Тарифні плани відрізняються кількістю активних клієнтів і доступними функціями для управління практикою, фінансами, документами та іншими процесами.",
      pl: "Plany różnią się liczbą aktywnych klientów i funkcjami do zarządzania praktyką, finansami, dokumentami i innymi procesami.",
      fr: "Les forfaits diffèrent par le nombre de clients actifs et les fonctions de gestion de la pratique, des finances, des documents et d'autres processus.",
      ru: "Тарифные планы отличаются количеством активных клиентов и доступными функциями для управления практикой, финансами, документами и другими процессами.",
    },
  },
  {
    q: {
      en: "Can I cancel my subscription at any time?",
      uk: "Чи можу я скасувати підписку в будь-який момент?",
      pl: "Czy mogę anulować subskrypcję w dowolnym momencie?",
      fr: "Puis-je annuler mon abonnement à tout moment ?",
      ru: "Могу ли я отменить подписку в любой момент?",
    },
    a: {
      en: "Yes. You can cancel in your account settings at any time. After cancelling, your paid plan stays active until the end of the current billing period.",
      uk: "Так. Підписку можна скасувати в будь-який момент у налаштуваннях акаунта. Після скасування оплачений тариф залишається активним до завершення поточного розрахункового періоду.",
      pl: "Tak. Subskrypcję możesz anulować w ustawieniach konta. Po anulowaniu opłacony plan pozostaje aktywny do końca bieżącego okresu rozliczeniowego.",
      fr: "Oui. Vous pouvez annuler à tout moment dans les paramètres du compte. Le forfait payé reste actif jusqu'à la fin de la période en cours.",
      ru: "Да. Подписку можно отменить в любой момент в настройках аккаунта. После отмены оплаченный тариф остаётся активным до конца текущего расчётного периода.",
    },
  },
  {
    q: {
      en: "What if a feature I need doesn't exist yet?",
      uk: "Що робити, якщо потрібної функції ще немає?",
      pl: "Co, jeśli potrzebnej funkcji jeszcze nie ma?",
      fr: "Et si la fonctionnalité dont j'ai besoin n'existe pas encore ?",
      ru: "Что делать, если нужной функции ещё нет?",
    },
    a: {
      en: "Write to us and tell us what's missing. We collect user suggestions and take them into account when planning the development of Solo .Bizz.",
      uk: "Напишіть нам і розкажіть, якої функції вам бракує. Ми збираємо пропозиції користувачів і враховуємо їх під час планування розвитку Solo .Bizz.",
      pl: "Napisz do nas i powiedz, czego brakuje. Zbieramy sugestie użytkowników i uwzględniamy je w planach rozwoju Solo .Bizz.",
      fr: "Écrivez-nous pour nous dire ce qui manque. Nous recueillons les suggestions et en tenons compte dans la feuille de route de Solo .Bizz.",
      ru: "Напишите нам и расскажите, какой функции вам не хватает. Мы собираем предложения пользователей и учитываем их при планировании развития Solo .Bizz.",
    },
  },
  {
    q: {
      en: "How quickly can I get started?",
      uk: "Як швидко можна почати користуватися?",
      pl: "Jak szybko można zacząć?",
      fr: "En combien de temps puis-je commencer ?",
      ru: "Как быстро можно начать пользоваться?",
    },
    a: {
      en: "Creating an account and the initial setup take about 5 minutes. After that you can add clients, set up your calendar and create bookings right away.",
      uk: "Створення акаунта та початкове налаштування практики займає близько 5 хвилин. Після цього можна одразу додавати клієнтів, налаштовувати календар і створювати записи.",
      pl: "Założenie konta i wstępna konfiguracja zajmują około 5 minut. Potem od razu możesz dodawać klientów, ustawiać kalendarz i tworzyć wizyty.",
      fr: "La création du compte et la configuration initiale prennent environ 5 minutes. Ensuite, vous pouvez ajouter des clients, régler l'agenda et créer des rendez-vous.",
      ru: "Создание аккаунта и первичная настройка практики занимают около 5 минут. После этого можно сразу добавлять клиентов, настраивать календарь и создавать записи.",
    },
  },
  {
    q: {
      en: "Where can I get help with setting up the system?",
      uk: "Де отримати консультацію з налаштування системи?",
      pl: "Gdzie uzyskać pomoc w konfiguracji systemu?",
      fr: "Où obtenir de l'aide pour configurer le système ?",
      ru: "Где получить консультацию по настройке системы?",
    },
    a: {
      en: "Contact the Solo .Bizz team through the contact form. We'll help you set up the system or arrange a demo of its features.",
      uk: "Зв'яжіться з командою Solo .Bizz через форму зворотного зв'язку. Ми допоможемо налаштувати систему або організуємо демонстрацію її можливостей.",
      pl: "Skontaktuj się z zespołem Solo .Bizz przez formularz kontaktowy. Pomożemy skonfigurować system lub pokażemy demo.",
      fr: "Contactez l'équipe Solo .Bizz via le formulaire de contact. Nous vous aiderons à configurer le système ou organiserons une démo.",
      ru: "Свяжитесь с командой Solo .Bizz через форму обратной связи. Мы поможем настроить систему или организуем демонстрацию её возможностей.",
    },
  },
];

const COPY = {
  benefitsTitle: {
    en: "Start with the plan that fits your practice",
    uk: "Почніть із тарифу, який відповідає вашій практиці",
    pl: "Zacznij od planu dopasowanego do Twojej praktyki",
    fr: "Commencez par le forfait adapté à votre pratique",
    ru: "Начните с тарифа, который подходит вашей практике",
  } as L,
  faqEyebrow: { en: "QUESTIONS AND ANSWERS", uk: "ПИТАННЯ ТА ВІДПОВІДІ", pl: "PYTANIA I ODPOWIEDZI", fr: "QUESTIONS ET RÉPONSES", ru: "ВОПРОСЫ И ОТВЕТЫ" } as L,
  faqTitle: {
    en: "Answers to the main questions",
    uk: "Відповіді на головні питання",
    pl: "Odpowiedzi na najważniejsze pytania",
    fr: "Réponses aux questions principales",
    ru: "Ответы на главные вопросы",
  } as L,
  ctaBadge: {
    en: "For professionals who work with clients",
    uk: "Для фахівців, які працюють із клієнтами",
    pl: "Dla specjalistów pracujących z klientami",
    fr: "Pour les professionnels qui travaillent avec des clients",
    ru: "Для специалистов, которые работают с клиентами",
  } as L,
  ctaTitle: {
    en: "Your practice deserves a system",
    uk: "Ваша практика заслуговує на систему",
    pl: "Twoja praktyka zasługuje na system",
    fr: "Votre pratique mérite un système",
    ru: "Ваша практика заслуживает системы",
  } as L,
  ctaText: {
    en: "All bookings, clients, payments and documents in one place. Start for free — setup takes just 5 minutes.",
    uk: "Усі записи, клієнти, оплати й документи в одному місці. Почніть безкоштовно — налаштування займає лише 5 хвилин.",
    pl: "Wszystkie wizyty, klienci, płatności i dokumenty w jednym miejscu. Zacznij za darmo — konfiguracja zajmuje 5 minut.",
    fr: "Tous les rendez-vous, clients, paiements et documents au même endroit. Commencez gratuitement — 5 minutes suffisent.",
    ru: "Все записи, клиенты, оплаты и документы в одном месте. Начните бесплатно — настройка занимает всего 5 минут.",
  } as L,
  ctaButton: { en: "Start for free", uk: "Почати безкоштовно", pl: "Zacznij za darmo", fr: "Commencer gratuitement", ru: "Начать бесплатно" } as L,
  ctaNote: {
    en: "No credit card required",
    uk: "Банківська картка не потрібна",
    pl: "Karta płatnicza nie jest wymagana",
    fr: "Aucune carte bancaire requise",
    ru: "Банковская карта не нужна",
  } as L,
  trust1: { en: "Data protected", uk: "Дані захищені", pl: "Dane chronione", fr: "Données protégées", ru: "Данные защищены" } as L,
  trust2: { en: "GDPR compliant", uk: "Відповідає GDPR", pl: "Zgodność z RODO", fr: "Conforme au RGPD", ru: "Соответствует GDPR" } as L,
  trust3: { en: "Secure payments via Stripe", uk: "Безпечні платежі через Stripe", pl: "Bezpieczne płatności przez Stripe", fr: "Paiements sécurisés via Stripe", ru: "Безопасные платежи через Stripe" } as L,
  trust4: { en: "Email support", uk: "Підтримка на email", pl: "Wsparcie e-mail", fr: "Assistance par e-mail", ru: "Поддержка на email" } as L,
};

/** Plan benefits + two-column FAQ + final dark CTA, rendered directly under the pricing cards. */
export function PricingFollowUp({ lang }: { lang: AppLanguage }) {
  const columns = [FAQ.slice(0, 3), FAQ.slice(3)];

  return (
    <>
      {/* 1 — plan benefits */}
      <section className="px-4 pb-4 pt-0 sm:px-6 bg-orange-50/60">
        <div className="mx-auto max-w-6xl rounded-3xl bg-muted/60 p-6 sm:p-10">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {p(lang, COPY.benefitsTitle)}
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <li key={b.title.en} className="flex flex-col items-center text-center">
                <b.icon className="h-6 w-6 text-secondary" strokeWidth={1.75} aria-hidden="true" />
                <strong className="mt-3 text-sm font-semibold text-foreground sm:text-base">{p(lang, b.title)}</strong>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{p(lang, b.text)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2 — FAQ */}
      <section id="faq" className="px-4 py-20 sm:px-6 bg-orange-50/60">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{p(lang, COPY.faqEyebrow)}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {p(lang, COPY.faqTitle)}
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            {columns.map((col, ci) => (
              <Accordion key={ci} type="multiple" className="space-y-4">
                {col.map((item, i) => (
                  <AccordionItem
                    key={item.q.en}
                    value={`faq-${ci}-${i}`}
                    className="rounded-xl border border-border bg-card px-5"
                  >
                    <AccordionTrigger className="py-4 text-left text-sm font-medium text-foreground hover:no-underline sm:text-base">
                      {p(lang, item.q)}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                      {p(lang, item.a)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — final CTA */}
      <section className="px-0 pb-0 pt-0">
        <div className="rounded-b-[2.5rem] bg-gradient-to-b from-secondary to-secondary/95 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5 text-xs font-medium text-primary sm:text-sm">
              {p(lang, COPY.ctaBadge)}
            </span>
            <h2 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-secondary-foreground sm:text-4xl">
              {p(lang, COPY.ctaTitle)}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-secondary-foreground/80">
              {p(lang, COPY.ctaText)}
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/auth?mode=signup"
                onClick={() => {
                  track("cta_clicked", { source_page: "/", cta: "final", lang });
                  track("registration_started", landingEventProps({ locale: lang, source_page: "/", cta: "final" }));
                }}
                className={`${buttonVariants({ size: "lg" })} h-12 w-full max-w-sm gap-2 rounded-xl px-8 text-base font-semibold shadow-[0_0_36px_hsl(var(--primary)/0.45)] transition-shadow hover:shadow-[0_0_48px_hsl(var(--primary)/0.6)] sm:w-auto`}
              >
                {p(lang, COPY.ctaButton)} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-sm text-secondary-foreground/70">{p(lang, COPY.ctaNote)}</p>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-secondary-foreground/80 sm:text-sm">
              {[COPY.trust1, COPY.trust2, COPY.trust3, COPY.trust4].map((item) => (
                <li key={item.en} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" /> {p(lang, item)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
