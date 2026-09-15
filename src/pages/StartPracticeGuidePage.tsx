import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/SeoHead";
import { PublicFooter } from "@/components/PublicFooter";
import { useLanguage } from "@/i18n/LanguageContext";

type Step = { title: string; body: string[] };
type Copy = {
  back: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string;
  steps: Step[];
  faqTitle: string;
  faq: { q: string; a: string }[];
  ctaTitle: string;
  ctaBody: string;
  ctaButton: string;
  disclaimer: string;
};

const UK: Copy = {
  back: "На головну",
  seoTitle: "Як почати приватну практику: клієнти, сесії, оплати — Solo .Bizz",
  seoDescription:
    "Покроковий гайд для психологів, психотерапевтів, коучів і репетиторів: з чого почати приватну практику, як вести клієнтів, розклад, оплати та згоди клієнтів.",
  h1: "Як почати приватну практику: клієнти, сесії, оплати та документи",
  intro:
    "Найчастіше питання приватного фахівця на старті — не «де взяти клієнтів», а «як не загубити те, що вже є»: записи, домовленості, оплати й нотатки. Нижче — практичні кроки, які можна пройти за один вечір, і те, як кожен із них виглядає в роботі щодня.",
  steps: [
    {
      title: "1. Визначте формат і ціну однієї сесії",
      body: [
        "Оберіть, які послуги ви надаєте (індивідуальна консультація, пара, група, супервізія), тривалість кожної та ціну.",
        "Зафіксуйте це письмово — далі саме цей список стане основою розкладу, рахунків і статистики доходу. Змінювати ціни можна будь-коли, важливо мати стартову точку.",
      ],
    },
    {
      title: "2. Зробіть один зрозумілий спосіб запису",
      body: [
        "Один канал запису краще, ніж чотири. Посилання на бронювання, де видно ваші вільні вікна, знімає листування «а коли вам зручно?».",
        "Одразу закладіть правила: за скільки годин можна перенести сесію, що вважається пропуском, чи є вихідні дні.",
      ],
    },
    {
      title: "3. Підготуйте згоду клієнта й правила роботи",
      body: [
        "Перед першою сесією клієнт має розуміти: що ви робите, як зберігаються дані, які умови оплати й скасування.",
        "Зручно мати шаблон угоди, який клієнт підписує за посиланням — так документ не загубиться, а у вас залишиться підтвердження дати підписання.",
      ],
    },
    {
      title: "4. Відділіть гроші практики від особистих",
      body: [
        "Записуйте кожну оплату й кожну витрату практики (оренда, супервізія, підписки, реклама) окремо від побутових витрат.",
        "Тоді наприкінці місяця видно реальний дохід, а не залишок на картці — і зрозуміло, скільки сесій треба, щоб вийти в нуль.",
      ],
    },
    {
      title: "5. Ведіть нотатки безпечно",
      body: [
        "Нотатки про сесії — чутливі дані. Їм не місце в месенджерах і звичайних документах у хмарі без захисту.",
        "Мінімум: доступ лише у вас, шифрування вмісту, можливість видалити дані клієнта на запит.",
      ],
    },
    {
      title: "6. Перевіряйте кілька цифр щомісяця",
      body: [
        "Активні клієнти, проведені сесії, сплачені та несплачені суми, витрати, точка беззбитковості.",
        "Ці шість чисел показують стан практики краще, ніж відчуття завантаженості.",
      ],
    },
  ],
  faqTitle: "Часті питання",
  faq: [
    {
      q: "З чого почати, якщо клієнтів поки одиниці?",
      a: "З простої системи: список клієнтів, розклад, запис оплат. Коли клієнтів більше, переносити хаос уже складно, а порядок масштабується сам.",
    },
    {
      q: "Чи потрібна окрема програма, чи вистачить таблиці?",
      a: "Таблиця працює на 3–5 клієнтах. Далі з'являються нагадування, перенесення, несплачені сесії й нотатки — і таблиця починає забирати більше часу, ніж економить.",
    },
    {
      q: "Як бути з даними клієнтів і приватністю?",
      a: "Зберігайте мінімум потрібного, тримайте нотатки в захищеному вигляді й майте спосіб видалити дані на запит клієнта. Це вимога GDPR і водночас звичайна професійна етика.",
    },
    {
      q: "Скільки коштує почати з Solo .Bizz?",
      a: "Безкоштовний план до 5 клієнтів, картка не потрібна. Далі — Solo для практики до 20 клієнтів і Pro без обмеження кількості.",
    },
  ],
  ctaTitle: "Зробіть перший крок сьогодні",
  ctaBody:
    "Solo .Bizz збирає клієнтів, розклад, оплати, витрати й угоди в одному спокійному місці — без зайвих налаштувань.",
  ctaButton: "Почати безкоштовно",
  disclaimer:
    "Це практичні поради з організації роботи, а не юридична чи податкова консультація. Реєстрацію діяльності та податки уточнюйте за законодавством своєї країни.",
};

const EN: Copy = {
  back: "Home",
  seoTitle: "How to start a private practice: clients, sessions, payments — Solo .Bizz",
  seoDescription:
    "A step-by-step guide for psychologists, therapists, coaches and tutors: how to start a private practice and keep clients, scheduling, payments and consents in order.",
  h1: "How to start a private practice: clients, sessions, payments and paperwork",
  intro:
    "The hardest part of starting a private practice usually isn't finding clients — it's not losing track of the ones you already have: bookings, agreements, payments and notes. Here are practical steps you can complete in one evening.",
  steps: [
    {
      title: "1. Define your services and session price",
      body: [
        "Decide what you offer (individual session, couple, group, supervision), how long each takes and what it costs.",
        "Write it down — this list becomes the basis of your schedule, invoices and income reporting. Prices can change later; you just need a starting point.",
      ],
    },
    {
      title: "2. Offer one clear way to book",
      body: [
        "One booking channel beats four. A booking link that shows your free slots removes the endless \"when works for you?\" exchange.",
        "Set the rules up front: how late a session can be moved, what counts as a no-show, which days you are off.",
      ],
    },
    {
      title: "3. Prepare a client agreement",
      body: [
        "Before the first session a client should know what you do, how their data is stored, and your payment and cancellation terms.",
        "A template the client signs through a link keeps the document safe and gives you proof of the signing date.",
      ],
    },
    {
      title: "4. Separate practice money from personal money",
      body: [
        "Record every payment and every practice expense (rent, supervision, subscriptions, ads) apart from personal spending.",
        "Then month-end shows real income instead of a bank balance — and how many sessions you need to break even.",
      ],
    },
    {
      title: "5. Keep session notes safely",
      body: [
        "Session notes are sensitive data. They don't belong in messengers or unprotected cloud documents.",
        "The minimum: access limited to you, encrypted content, and a way to delete a client's data on request.",
      ],
    },
    {
      title: "6. Review a few numbers every month",
      body: [
        "Active clients, sessions delivered, paid and unpaid amounts, expenses, break-even point.",
        "These six numbers describe your practice better than how busy it feels.",
      ],
    },
  ],
  faqTitle: "Frequently asked questions",
  faq: [
    {
      q: "Where do I start if I only have a couple of clients?",
      a: "With a simple system: a client list, a schedule, and recorded payments. Order scales; migrating chaos later does not.",
    },
    {
      q: "Do I need software, or is a spreadsheet enough?",
      a: "A spreadsheet works for 3–5 clients. Once reminders, reschedules, unpaid sessions and notes appear, it costs more time than it saves.",
    },
    {
      q: "What about client data and privacy?",
      a: "Store only what you need, keep notes protected, and be able to delete a client's data on request. That is GDPR — and basic professional ethics.",
    },
    {
      q: "What does it cost to start with Solo .Bizz?",
      a: "A free plan for up to 5 clients, no card required. Then Solo for practices up to 20 clients, and Pro with no client limit.",
    },
  ],
  ctaTitle: "Take the first step today",
  ctaBody:
    "Solo .Bizz keeps clients, scheduling, payments, expenses and agreements in one calm place — with almost no setup.",
  ctaButton: "Start for free",
  disclaimer:
    "This is practical guidance on organising your work, not legal or tax advice. Check business registration and tax rules for your own country.",
};

const COPY: Record<string, Copy> = { uk: UK, ru: UK, en: EN, pl: EN, fr: EN };

export default function StartPracticeGuidePage() {
  const { lang } = useLanguage();
  const c = COPY[lang] ?? EN;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: c.h1,
      description: c.seoDescription,
      inLanguage: lang,
      mainEntityOfPage: "https://solo-bizz.com/guides/start-private-practice",
      publisher: { "@type": "Organization", name: "Solo .Bizz", url: "https://solo-bizz.com" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Solo .Bizz", item: "https://solo-bizz.com/" },
        { "@type": "ListItem", position: 2, name: c.h1, item: "https://solo-bizz.com/guides/start-private-practice" },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SeoHead
        path="/guides/start-private-practice"
        title={c.seoTitle}
        description={c.seoDescription}
        jsonLd={jsonLd}
      />

      <header className="flex h-16 items-center border-b border-border px-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground"><BrandName /></Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {c.back}
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-12 sm:px-6">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{c.h1}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{c.intro}</p>

          <div className="mt-10 space-y-8">
            {c.steps.map((s) => (
              <section key={s.title}>
                <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
                {s.body.map((p) => (
                  <p key={p} className="mt-2 text-muted-foreground">{p}</p>
                ))}
              </section>
            ))}
          </div>

          <h2 className="mt-12 text-2xl font-semibold text-foreground">{c.faqTitle}</h2>
          <dl className="mt-4 space-y-5">
            {c.faq.map((f) => (
              <div key={f.q}>
                <dt className="font-medium text-foreground">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>

          <aside className="mt-12 rounded-2xl border border-border bg-muted/40 p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground">{c.ctaTitle}</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{c.ctaBody}</p>
            <Link to="/auth">
              <Button size="lg" className="mt-5 gap-2">
                {c.ctaButton} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </aside>

          <p className="mt-8 text-xs text-muted-foreground">{c.disclaimer}</p>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
