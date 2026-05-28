import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { BookingDialog } from "@/components/BookingDialog";

import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { getStoredLang, setPreLoginLang } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";
import { track } from "@/lib/analytics";
import {
  ArrowRight, CheckCircle2, AlertTriangle, TrendingUp,
  Calendar as CalendarIcon, Users, Sparkles, ShieldCheck,
  X, Check, HeartHandshake, Presentation, BookOpen, Clock, Timer,
  Quote, MessageCircle, Mail, Phone, MapPin, Send,
  Contact, Link2, Bell, CreditCard, ReceiptText, BarChart3,
  ClipboardCheck, Calculator, MessagesSquare, Route,
} from "lucide-react";

// ── Configurable external links (replace as needed) ───────────────────
const YOUTUBE_URL = "https://www.youtube.com/@OneBizz_SoloBizz";
const CONTACT_EMAIL = "info@solo-bizz.com";
const CONTACT_OR_CALENDAR_URL = `mailto:${CONTACT_EMAIL}`;
const BOOKING_URL = "#booking"; // [BOOKING_OR_CONTACT_FORM_URL]
const TELEGRAM_URL = "https://t.me/solobizzcontact";
const TELEGRAM_HANDLE = "@solobizzcontact";
const PHONE_NUMBER = "+48 572 600 256";
const OFFICE_ADDRESS = "Poland, Wrocław, Gwiaździsta 16";
const VACANCIES_URL = "/careers";

// ── Local landing-page copy (EN / FR / UK / PL) ───────────────────────

type Copy = Record<Language, string>;
const C = {
  // Nav
  navAudience: { en: "Who it's for", fr: "Pour qui", uk: "Кому підходить", pl: "Dla kogo" },
  navHow: { en: "Comparison", fr: "Comparaison", uk: "Порівняння", pl: "Porównanie" },
  navPricing: { en: "Pricing", fr: "Tarifs", uk: "Ціни", pl: "Cennik" },
  navFaq: { en: "FAQ", fr: "FAQ", uk: "Питання", pl: "FAQ" },
  navLogin: { en: "Log in", fr: "Connexion", uk: "Увійти", pl: "Zaloguj się" },
  navTry: { en: "Start for free", fr: "Commencer gratuitement", uk: "Почати безкоштовно", pl: "Zacznij za darmo" },

  // Hero
  heroBadge: { en: "For psychologists, psychotherapists, supervisors and educators", fr: "Pour psychologues, psychothérapeutes, superviseurs et formateurs", uk: "Для психологів, психотерапевтів, супервізорів і викладачів", pl: "Dla psychologów, psychoterapeutów, superwizorów i edukatorów" },
  heroTitle: {
    en: "Your full private practice. Organised in one place.",
    fr: "Toute votre pratique privée. Organisée au même endroit.",
    uk: "Уся ваша приватна практика. В одному місці.",
    pl: "Cała Twoja prywatna praktyka. W jednym miejscu.",
  },
  heroTitlePrefix: {
    en: "Your full private practice.",
    fr: "Toute votre pratique privée.",
    uk: "Уся ваша приватна практика.",
    pl: "Cała Twoja prywatna praktyka.",
  },
  heroTitleAccent: {
    en: "Organised in one place.",
    fr: "Organisée au même endroit.",
    uk: "В одному місці.",
    pl: "W jednym miejscu.",
  },
  heroSub: {
    en: "SoloBizz manages your clients, calendar, bookings, payments, invoices and financial reports — automatically. So you spend your time on clients, not spreadsheets.",
    fr: "SoloBizz gère vos clients, agenda, réservations, paiements, factures et rapports financiers — automatiquement. Vous consacrez votre temps aux clients, pas aux tableurs.",
    uk: "SoloBizz керує клієнтами, календарем, записами, оплатами, рахунками та фінансовими звітами — автоматично. Ви витрачаєте час на клієнтів, а не на таблиці.",
    pl: "SoloBizz prowadzi klientów, kalendarz, zapisy, płatności, faktury i raporty finansowe — automatycznie. Czas poświęcasz klientom, a nie arkuszom.",
  },
  heroCta: { en: "Start free — no card needed", fr: "Commencer gratuitement — sans carte", uk: "Почати безкоштовно — без картки", pl: "Zacznij za darmo — bez karty" },
  heroSecondary: { en: "See pricing", fr: "Voir les tarifs", uk: "Подивитись ціни", pl: "Zobacz cennik" },
  heroSubCta: {
    en: "Free Starter: free forever, up to 5 active clients. No credit card required.",
    fr: "Free Starter : gratuit pour toujours, jusqu'à 5 clients actifs. Sans carte bancaire.",
    uk: "Free Starter: безкоштовно назавжди, до 5 активних клієнтів. Без банківської картки.",
    pl: "Free Starter: za darmo na zawsze, do 5 aktywnych klientów. Bez karty kredytowej.",
  },
  // Stats
  statsTherapists: { en: "therapists already use SoloBizz", fr: "thérapeutes utilisent déjà SoloBizz", uk: "терапевтів вже користуються SoloBizz", pl: "terapeutów już korzysta z SoloBizz" },
  statsTime: { en: "of admin time saved every week", fr: "de temps admin économisé chaque semaine", uk: "адмін-часу заощаджується щотижня", pl: "czasu administracyjnego oszczędzane co tydzień" },
  statsSetup: { en: "average practice setup time", fr: "temps moyen d'installation de la pratique", uk: "середній час налаштування практики", pl: "średni czas konfiguracji praktyki" },
  setupAssist: { en: "Want a fast start? Leave a request — and we'll help set up your practice.", fr: "Vous voulez démarrer vite ? Laissez une demande — nous vous aidons à configurer votre pratique.", uk: "Хочете швидкий старт? Залиште заявку — і ми допоможемо налаштувати практику.", pl: "Chcesz szybki start? Zostaw zgłoszenie — pomożemy skonfigurować praktykę." },

  heroRoi: {
    en: "With 20+ clients, manual admin can take 4–8+ hours a week. SoloBizz helps you win that time back.",
    fr: "Avec 20+ clients, l'admin manuelle peut prendre 4 à 8+ heures par semaine. SoloBizz vous aide à récupérer ce temps.",
    uk: "Коли у вас 20+ клієнтів, ручна адмінка може забирати 4–8+ годин на тиждень. SoloBizz допомагає повернути цей час назад.",
    pl: "Przy 20+ klientach ręczna administracja może zajmować 4–8+ godzin tygodniowo. SoloBizz pomaga odzyskać ten czas.",
  },
  trustData: { en: "Client data is protected", fr: "Données clients protégées", uk: "Дані клієнтів захищені", pl: "Dane klientów chronione" },
  trustStripe: { en: "Secure Stripe payments", fr: "Paiements sécurisés via Stripe", uk: "Безпечна оплата через Stripe", pl: "Bezpieczne płatności przez Stripe" },
  trustGdpr: { en: "GDPR compliant", fr: "Conforme RGPD", uk: "Відповідає GDPR", pl: "Zgodne z RODO" },
  trustSupport: { en: "Email support", fr: "Support email", uk: "Підтримка через email", pl: "Wsparcie przez email" },

  // Dashboard preview
  dpClients: { en: "Active clients", fr: "Clients actifs", uk: "Активні клієнти", pl: "Aktywni klienci" },
  dpSessions: { en: "Sessions this week", fr: "Séances cette semaine", uk: "Сесій цього тижня", pl: "Sesje w tym tygodniu" },
  dpIncome: { en: "Income this month", fr: "Revenus ce mois", uk: "Дохід цього місяця", pl: "Przychód w tym miesiącu" },
  dpUpcoming: { en: "Upcoming sessions", fr: "Séances à venir", uk: "Найближчі сесії", pl: "Nadchodzące sesje" },
  dpPaid: { en: "Paid", fr: "Payé", uk: "Оплачено", pl: "Opłacone" },
  dpPending: { en: "Pending", fr: "En attente", uk: "Очікує", pl: "Oczekujące" },

  // Pain
  painTitle: { en: "Does this sound familiar?", fr: "Ça vous parle ?", uk: "Звучить знайомо?", pl: "Brzmi znajomo?" },
  painHeadline: {
    en: "This happens in most private practices",
    fr: "Cela arrive dans la plupart des pratiques privées",
    uk: "Це відбувається у більшості приватних практик",
    pl: "To się dzieje w większości prywatnych praktyk",
  },
  pain1: {
    en: "You don't know your real monthly income until you calculate everything manually.",
    fr: "Vous ne connaissez pas vos vrais revenus mensuels tant que vous ne faites pas les calculs à la main.",
    uk: "Ви не знаєте реального місячного доходу, доки не рахуєте все вручну.",
    pl: "Nie znasz swoich rzeczywistych miesięcznych dochodów, dopóki nie policzysz wszystkiego ręcznie.",
  },
  pain2: {
    en: "Records are scattered in different places: calendar, messengers, Excel and notes.",
    fr: "Les données sont éparpillées : calendrier, messageries, Excel et notes.",
    uk: "Записи розкидані в різних місцях: календар, месенджери, Excel і нотатки.",
    pl: "Zapisy są rozrzucone w różnych miejscach: kalendarz, komunikatory, Excel i notatki.",
  },
  pain3: {
    en: "Payments, debts and prepayments have to be remembered or checked manually.",
    fr: "Paiements, dettes et avances : il faut se les rappeler ou les vérifier manuellement.",
    uk: "Оплати, борги та передоплати доводиться згадувати або перевіряти вручну.",
    pl: "Płatności, długi i zaliczki trzeba pamiętać lub sprawdzać ręcznie.",
  },
  pain4: {
    en: "You may be losing clients because you don't have time to respond in time.",
    fr: "Vous pouvez perdre des clients parce que vous n'avez pas le temps de répondre à temps.",
    uk: "Ви можете втрачати клієнтів, бо не встигаєте відповісти їм вчасно.",
    pl: "Możesz tracić klientów, ponieważ nie zdążasz odpowiedzieć na czas.",
  },
  pain5: {
    en: "It's hard to understand what session price to set so the practice is profitable.",
    fr: "Il est difficile de savoir quel tarif de séance fixer pour que la pratique soit rentable.",
    uk: "Складно зрозуміти, яку вартість сесії ставити, щоб практика була прибутковою.",
    pl: "Trudno zrozumieć, jaką cenę sesji ustalić, aby praktyka była rentowna.",
  },
  pain6: {
    en: "Too much time goes to routine, yet the full picture of the practice is still not visible.",
    fr: "Trop de temps part en routine, et pourtant la vue d'ensemble de la pratique reste invisible.",
    uk: "Забагато часу йде на рутину, а цілісної картини практики все одно не видно.",
    pl: "Zbyt dużo czasu idzie na rutynę, a pełnego obrazu praktyki wciąż nie widać.",
  },
  painBottom: {
    en: "This isn't a productivity problem. It's the absence of a system built for private practice. SoloBizz is that system.",
    fr: "Ce n'est pas un problème de productivité. C'est l'absence d'un système conçu pour la pratique privée. SoloBizz est ce système.",
    uk: "Це не проблема продуктивності. Це відсутність системи, створеної для приватної практики. SoloBizz — це та система.",
    pl: "To nie jest problem produktywności. To brak systemu stworzonego dla prywatnej praktyki. SoloBizz to ten system.",
  },
  painCta: { en: "See how SoloBizz works", fr: "Voir comment SoloBizz fonctionne", uk: "Дивись, як це працює в SoloBizz", pl: "Zobacz, jak działa SoloBizz" },

  // What Changes
  whatChangesEyebrow: { en: "WHAT CHANGES", fr: "CE QUI CHANGE", uk: "ЩО ЗМІНЮЄТЬСЯ", pl: "CO SIĘ ZMIENIA" },
  whatChangesHeadline: { en: "The same Monday. A completely different start to the day.", fr: "Le même lundi. Un tout autre début de journée.", uk: "Той самий понеділок. Зовсім інший початок дня.", pl: "Ten sam poniedziałek. Zupełnie inny początek dnia." },
  whatChangesSub: { en: "See how one tool replaces the morning chaos with clarity and control.", fr: "Découvrez comment un seul outil remplace le chaos matinal par la clarté et le contrôle.", uk: "Подивіться, як один інструмент замінює ранковий хаос на ясність і контроль.", pl: "Zobacz, jak jedno narzędzie zastępuje poranny chaos przejrzystością i kontrolą." },
  whatChangesWithoutTitle: { en: "Monday without SoloBizz", fr: "Lundi sans SoloBizz", uk: "Понеділок без SoloBizz", pl: "Poniedziałek bez SoloBizz" },
  whatChangesWithTitle: { en: "Monday with SoloBizz", fr: "Lundi avec SoloBizz", uk: "Понеділок з SoloBizz", pl: "Poniedziałek z SoloBizz" },
  whatChangesWithout1: { en: "You open 5 different apps to remember who's coming today.", fr: "Vous ouvrez 5 applications différentes pour vous rappeler qui vient aujourd'hui.", uk: "Відкриваєте 5 різних додатків, щоб згадати, хто сьогодні на прийомі.", pl: "Otwierasz 5 różnych aplikacji, żeby przypomnieć sobie, kto dziś przychodzi." },
  whatChangesWithout2: { en: "You check payments manually — and worry about missing something.", fr: "Vous vérifiez les paiements manuellement — et craignez d'oublier quelque chose.", uk: "Перевіряєте оплати вручну — і боїтеся щось упустити.", pl: "Sprawdzasz płatności ręcznie — i boisz się, że coś przeoczysz." },
  whatChangesWithout3: { en: "You spend 30+ minutes sending reminders to clients.", fr: "Vous passez 30+ minutes à envoyer des rappels aux clients.", uk: "Тратите 30+ хвилин на розсилку нагадувань клієнтам.", pl: "Spędzasz 30+ minut na wysyłaniu przypomnień klientom." },
  whatChangesWithout4: { en: "You don't know exactly how much you earned last week.", fr: "Vous ne savez pas exactement combien vous avez gagné la semaine dernière.", uk: "Не знаєте точно, скільки заробили за минулий тиждень.", pl: "Nie wiesz dokładnie, ile zarobiłeś w zeszłym tygodniu." },
  whatChangesWithout5: { en: "You plan your schedule by eye, without knowing your workload.", fr: "Vous planifiez votre emploi du temps à l'œil nu, sans connaître votre charge.", uk: "Плануєте розклад «на око», без розуміння завантаженості.", pl: "Planujesz harmonogram „na oko”, bez zrozumienia obciążenia." },
  whatChangesWithout6: { en: "The start of the week is stress and chaos.", fr: "Le début de la semaine, c'est le stress et le chaos.", uk: "Початок тижня — це стрес і хаос.", pl: "Początek tygodnia to stres i chaos." },
  whatChangesWith1: { en: "One glance at the calendar — and you see your whole day.", fr: "Un coup d'œil au calendrier — et vous voyez toute votre journée.", uk: "Один погляд на календар — і ви бачите весь день.", pl: "Jedno spojrzenie na kalendarz — i widzisz cały dzień." },
  whatChangesWith2: { en: "All payments and debts are highlighted automatically.", fr: "Tous les paiements et dettes sont mis en surbrillance automatiquement.", uk: "Всі оплати й борги підсвічені автоматично.", pl: "Wszystkie płatności i długi są podświetlane automatycznie." },
  whatChangesWith3: { en: "Reminders are sent on their own — no effort needed.", fr: "Les rappels sont envoyés tout seuls — sans effort.", uk: "Нагадування відправляються самі — без вашої участі.", pl: "Przypomnienia wysyłają się same — bez twojego wysiłku." },
  whatChangesWith4: { en: "Income and profit are calculated in real time.", fr: "Les revenus et les bénéfices sont calculés en temps réel.", uk: "Дохід і прибуток рахуються в реальному часі.", pl: "Dochód i zysk są obliczane w czasie rzeczywistym." },
  whatChangesWith5: { en: "Clients book themselves through your link.", fr: "Les clients réservent eux-mêmes via votre lien.", uk: "Клієнти записуються самі через ваше посилання.", pl: "Klienci zapisują się sami przez twój link." },
  whatChangesWith6: { en: "The start of the week is calm and under control.", fr: "Le début de la semaine est calme et sous contrôle.", uk: "Початок тижня — це спокій і контроль.", pl: "Początek tygodnia to spokój i kontrola." },
  whatChangesSummary: { en: "The difference isn't how many hours you work. It's how many of them go to what truly matters.", fr: "La différence n'est pas le nombre d'heures travaillées. C'est combien d'entre elles sont consacrées à ce qui compte vraiment.", uk: "Різниця не в тому, скільки годин ви працюєте. Різниця в тому, скільки з них йде на те, що справді важливо.", pl: "Różnica nie polega na tym, ile godzin pracujesz. Chodzi o to, ile z nich idzie na to, co naprawdę się liczy." },

  // What's included (feature overview)
  featEyebrow: { en: "WHAT'S INCLUDED", fr: "CE QUI EST INCLUS", uk: "ЩО ВКЛЮЧЕНО", pl: "CO JEST W ZESTAWIE" },
  featHeadline: { en: "Everything you need for your practice. In one system.", fr: "Tout ce dont vous avez besoin pour votre pratique. Dans un seul système.", uk: "Все необхідне для практики. В одній системі.", pl: "Wszystko, czego potrzebujesz w praktyce. W jednym systemie." },
  featSub: { en: "No integrations. No complex setup. One system — from the first session to the final payment.", fr: "Sans intégrations. Sans configuration complexe. Un seul système — de la première séance au paiement final.", uk: "Без інтеграцій. Без складного налаштування. Одна система — від першої сесії до фінальної оплати.", pl: "Bez integracji. Bez skomplikowanej konfiguracji. Jeden system — od pierwszej sesji do finalnej płatności." },

  feat1Title: { en: "Client management", fr: "Gestion des clients", uk: "Управління клієнтами", pl: "Zarządzanie klientami" },
  feat1Desc: { en: "All profiles, notes and client history — in one structured place.", fr: "Tous les profils, notes et historiques clients — en un seul endroit structuré.", uk: "Усі профілі, нотатки та історія клієнта — в одному структурованому місці.", pl: "Wszystkie profile, notatki i historia klienta — w jednym uporządkowanym miejscu." },
  feat2Title: { en: "Calendar & scheduling", fr: "Calendrier et planning", uk: "Календар і розклад", pl: "Kalendarz i harmonogram" },
  feat2Desc: { en: "Plan and manage sessions in one convenient practice calendar.", fr: "Planifiez et gérez les séances dans un calendrier de pratique pratique.", uk: "Плануйте та керуйте сесіями в одному зручному календарі практики.", pl: "Planuj i zarządzaj sesjami w jednym wygodnym kalendarzu praktyki." },
  feat3Title: { en: "Public booking link", fr: "Lien public de réservation", uk: "Публічне посилання для запису", pl: "Publiczny link do rezerwacji" },
  feat3Desc: { en: "Clients book a convenient time directly from your page.", fr: "Les clients réservent un créneau directement depuis votre page.", uk: "Клієнти бронюють зручний час напряму з вашої сторінки.", pl: "Klienci rezerwują dogodny czas bezpośrednio z Twojej strony." },
  feat4Title: { en: "Reminders & confirmations", fr: "Rappels et confirmations", uk: "Нагадування та підтвердження", pl: "Przypomnienia i potwierdzenia" },
  feat4Desc: { en: "Automatic reminders reduce the number of missed sessions.", fr: "Les rappels automatiques réduisent les séances manquées.", uk: "Автоматичні нагадування скорочують кількість пропущених сесій.", pl: "Automatyczne przypomnienia zmniejszają liczbę nieodbytych sesji." },
  feat5Title: { en: "Payment tracking", fr: "Suivi des paiements", uk: "Відстеження оплат", pl: "Śledzenie płatności" },
  feat5Desc: { en: "See who paid, who owes and who prepaid — at a glance.", fr: "Voyez qui a payé, qui doit et qui a payé d'avance — d'un coup d'œil.", uk: "Бачите, хто заплатив, хто винен і хто має передоплату — з першого погляду.", pl: "Zobacz, kto zapłacił, kto jest dłużny, a kto zapłacił z góry — na pierwszy rzut oka." },
  feat6Title: { en: "Invoices", fr: "Factures", uk: "Рахунки-фактури", pl: "Faktury" },
  feat6Desc: { en: "Create and send invoices in seconds, straight from sessions.", fr: "Créez et envoyez des factures en quelques secondes, directement depuis les séances.", uk: "Створюйте та надсилайте рахунки за секунди прямо із сесій.", pl: "Twórz i wysyłaj faktury w kilka sekund, prosto z sesji." },
  feat7Title: { en: "Financial analytics", fr: "Analyse financière", uk: "Фінансова аналітика", pl: "Analityka finansowa" },
  feat7Desc: { en: "Monthly income, expenses and unpaid sessions always in plain sight.", fr: "Revenus mensuels, dépenses et séances impayées toujours visibles.", uk: "Місячний дохід, витрати та неоплачені сесії завжди перед очима.", pl: "Miesięczny dochód, wydatki i nieopłacone sesje zawsze pod ręką." },
  feat8Title: { en: "Client notes", fr: "Notes clients", uk: "Нотатки клієнта", pl: "Notatki klienta" },
  feat8Desc: { en: "Structured notes linked to every client journey.", fr: "Notes structurées liées à chaque parcours client.", uk: "Структуровані нотатки, прив'язані до кожного клієнтського шляху.", pl: "Uporządkowane notatki powiązane z każdą ścieżką klienta." },
  feat9Title: { en: "Data protection", fr: "Protection des données", uk: "Захист даних", pl: "Ochrona danych" },
  feat9Desc: { en: "Client data is fully private. SoloBizz has no access to it. The system follows a GDPR-compliant approach.", fr: "Les données clients sont entièrement privées. SoloBizz n'y a pas accès. Le système suit une approche conforme au RGPD.", uk: "Дані клієнтів повністю приватні. SoloBizz не має до них доступу. Система підтримує GDPR-compliant підхід.", pl: "Dane klientów są w pełni prywatne. SoloBizz nie ma do nich dostępu. System jest zgodny z RODO." },
  feat10Title: { en: "Session cost calculator", fr: "Calcul du coût des séances", uk: "Розрахунок вартості сесії", pl: "Wyliczanie kosztu sesji" },
  feat10Desc: { en: "Understand the real cost of one session and the financial state of your practice.", fr: "Comprenez le coût réel d'une séance et l'état financier de votre pratique.", uk: "Зрозумійте реальну вартість однієї сесії та фінансовий стан практики.", pl: "Zrozum rzeczywisty koszt jednej sesji i stan finansowy swojej praktyki." },
  feat11Title: { en: "Supervision tracking", fr: "Suivi des supervisions", uk: "Відстеження супервізій", pl: "Śledzenie superwizji" },
  feat11Desc: { en: "Create and keep supervision records as part of your professional work.", fr: "Créez et conservez les enregistrements de supervision dans le cadre de votre travail.", uk: "Створюйте та ведіть записи супервізій як частину вашої професійної роботи.", pl: "Twórz i prowadź zapisy superwizji jako część swojej pracy zawodowej." },
  feat12Title: { en: "The full client journey", fr: "Le parcours client complet", uk: "Повний шлях клієнта", pl: "Pełna ścieżka klienta" },
  feat12Desc: { en: "From first contact to end of therapy — in one system.", fr: "Du premier contact à la fin de la thérapie — dans un seul système.", uk: "Від першого контакту до завершення терапії — в одній системі.", pl: "Od pierwszego kontaktu do zakończenia terapii — w jednym systemie." },

  // CTAs under What Changes / Features
  whatChangesSummaryHighlight: { en: "what truly matters", fr: "ce qui compte vraiment", uk: "що справді важливо", pl: "co naprawdę się liczy" },
  whatChangesCta: { en: "Start free", fr: "Commencer gratuitement", uk: "Почати безкоштовно", pl: "Zacznij za darmo" },
  whatChangesCtaNote: { en: "No card required. You can start in a few minutes.", fr: "Sans carte. Vous pouvez commencer en quelques minutes.", uk: "Без картки. Можна почати за кілька хвилин.", pl: "Bez karty. Możesz zacząć w kilka minut." },
  featCta: { en: "Try SoloBizz for free", fr: "Essayer SoloBizz gratuitement", uk: "Спробувати SoloBizz безкоштовно", pl: "Wypróbuj SoloBizz za darmo" },
  featCtaNote: { en: "All key features available from day one.", fr: "Toutes les fonctionnalités clés disponibles dès le premier jour.", uk: "Усі ключові функції доступні з першого дня.", pl: "Wszystkie kluczowe funkcje dostępne od pierwszego dnia." },



  demoTitle: {
    en: "See how your practice could look in 60 seconds",
    fr: "Voyez à quoi votre cabinet peut ressembler en 60 secondes",
    uk: "Подивіться, як може виглядати ваша практика за 60 секунд",
    pl: "Zobacz, jak Twoja praktyka mogłaby wyglądać w 60 sekund",
  },
  demoText: {
    en: "A live preview of clients, sessions, payments and income — built for solo practices.",
    fr: "Aperçu en direct de clients, séances, paiements et revenus — conçu pour les praticiens en solo.",
    uk: "Живий перегляд клієнтів, сесій, оплат і доходу — створений для приватної практики.",
    pl: "Podgląd klientów, sesji, płatności i dochodu — stworzony dla praktyk solo.",
  },

  // Comparison
  cmpTitle: {
    en: "Excel, notebooks and chaos — or SoloBizz",
    fr: "Excel, carnets et chaos — ou SoloBizz",
    uk: "Excel, блокноти й хаос — або SoloBizz",
    pl: "Excel, notesy i chaos — albo SoloBizz",
  },
  cmpSub: {
    en: "Compare manual tracking with a system that automatically shows you bookings, payments, debts, income and profit.",
    fr: "Comparez le suivi manuel à un système qui affiche automatiquement rendez-vous, paiements, dettes, revenus et bénéfice.",
    uk: "Порівняйте ручний облік із системою, яка автоматично показує вам записи, оплати, борги, дохід і прибуток.",
    pl: "Porównaj ręczną ewidencję z systemem, który automatycznie pokazuje rezerwacje, płatności, długi, dochód i zysk.",
  },
  cmpManual: { en: "Manual tracking", fr: "Suivi manuel", uk: "Ручний облік", pl: "Ręczna ewidencja" },
  cmpSolo: { en: "SoloBizz", fr: "SoloBizz", uk: "SoloBizz", pl: "SoloBizz" },
  cmpM1: { en: "Records scattered across places", fr: "Données éparpillées partout", uk: "Записи в різних місцях", pl: "Zapisy rozproszone w różnych miejscach" },
  cmpM2: { en: "Payments must be checked manually", fr: "Paiements à vérifier manuellement", uk: "Оплати треба перевіряти вручну", pl: "Płatności trzeba sprawdzać ręcznie" },
  cmpM3: { en: "Easy to forget debts", fr: "Facile d'oublier les impayés", uk: "Борги легко забути", pl: "Łatwo zapomnieć o długach" },
  cmpM4: { en: "No real analytics", fr: "Pas de vraie analytique", uk: "Немає реальної аналітики", pl: "Brak prawdziwej analityki" },
  cmpM5: { en: "Hard to understand profit", fr: "Difficile de comprendre le bénéfice", uk: "Складно зрозуміти прибуток", pl: "Trudno zrozumieć zysk" },
  cmpM6: { en: "A lot of time spent on spreadsheets", fr: "Beaucoup de temps perdu sur les tableurs", uk: "Багато часу йде на таблиці", pl: "Dużo czasu zjadają arkusze" },
  cmpS1: { en: "Clients, sessions and payments in one system", fr: "Clients, séances et paiements dans un seul système", uk: "Клієнти, сесії та оплати в одній системі", pl: "Klienci, sesje i płatności w jednym systemie" },
  cmpS2: { en: "Automatic payment tracking", fr: "Suivi automatique des paiements", uk: "Автоматичний облік оплат", pl: "Automatyczna ewidencja płatności" },
  cmpS3: { en: "Debts and prepayments visible", fr: "Dettes et avances visibles", uk: "Видно борги та передоплати", pl: "Długi i zaliczki widoczne" },
  cmpS4: { en: "Income and expense analytics", fr: "Analytique revenus et dépenses", uk: "Аналітика доходів і витрат", pl: "Analityka przychodów i wydatków" },
  cmpS5: { en: "Clear financial result", fr: "Résultat financier clair", uk: "Зрозумілий фінансовий результат", pl: "Czytelny wynik finansowy" },
  cmpS6: { en: "Less routine, more time for practice", fr: "Moins de routine, plus de temps pour la pratique", uk: "Менше рутини, більше часу на практику", pl: "Mniej rutyny, więcej czasu na praktykę" },
  cmpCta: { en: "Try for free", fr: "Essayer gratuitement", uk: "Спробувати безкоштовно", pl: "Wypróbuj za darmo" },
  cmpCtaNote: {
    en: "No credit card. No complex setup.",
    fr: "Sans carte. Sans configuration complexe.",
    uk: "Без картки. Без складних налаштувань.",
    pl: "Bez karty. Bez skomplikowanej konfiguracji.",
  },
  cmpManualBadge: {
    en: "Before",
    fr: "Avant",
    uk: "До",
    pl: "Przed",
  },
  cmpSoloBadge: {
    en: "After",
    fr: "Après",
    uk: "Після",
    pl: "Po",
  },

  // Pricing
  pricingTitle: { en: "Your full practice, organised from day one. Free until you grow.", fr: "Toute votre pratique, organisée dès le premier jour. Gratuite jusqu'à ce que vous grandissiez.", uk: "Уся ваша практика впорядкована з першого дня. Безкоштовно, поки ви ростете.", pl: "Cała Twoja praktyka uporządkowana od pierwszego dnia. Darmowa, dopóki rośniesz." },
  pricingSub: {
    en: "All core features are included in every plan. The only difference is the number of active clients you can manage. No hidden feature locks. No calendar limits.",
    fr: "Toutes les fonctionnalités principales sont incluses dans chaque forfait. La seule différence est le nombre de clients actifs que vous pouvez gérer. Aucune fonctionnalité bloquée. Aucune limite de calendrier.",
    uk: "Усі основні функції доступні в кожному плані. Єдина різниця — кількість активних клієнтів, з якими ви працюєте. Жодних прихованих обмежень. Жодних лімітів календаря.",
    pl: "Wszystkie kluczowe funkcje są zawarte w każdym planie. Jedyna różnica to liczba aktywnych klientów, którymi możesz zarządzać. Żadnych ukrytych blokad. Żadnych limitów kalendarza.",
  },

  monthly: { en: "Monthly", fr: "Mensuel", uk: "Щомісяця", pl: "Miesięcznie" },
  quarterly: { en: "Quarterly", fr: "Trimestriel", uk: "Щокварталу", pl: "Kwartalnie" },
  yearly: { en: "Yearly", fr: "Annuel", uk: "Щороку", pl: "Rocznie" },
  save20: { en: "−20%", fr: "−20 %", uk: "−20%", pl: "−20%" },
  save40: { en: "−40%", fr: "−40 %", uk: "−40%", pl: "−40%" },
  perMonth: { en: "/month", fr: "/mois", uk: "/міс", pl: "/miesiąc" },
  perQuarter: { en: "/quarter", fr: "/trimestre", uk: "/квартал", pl: "/kwartał" },
  perYear: { en: "/year", fr: "/an", uk: "/рік", pl: "/rok" },
  equivalentTo: { en: "≈ {price}/month", fr: "≈ {price}/mois", uk: "≈ {price}/міс", pl: "≈ {price}/miesiąc" },
  billedMo: { en: "Billed monthly", fr: "Facturé mensuellement", uk: "Оплата щомісяця", pl: "Rozliczane co miesiąc" },
  billedQ: { en: "Billed every 3 months", fr: "Facturé tous les 3 mois", uk: "Оплата раз на 3 місяці", pl: "Rozliczane co 3 miesiące" },
  billedY: { en: "Billed yearly", fr: "Facturé annuellement", uk: "Оплата раз на рік", pl: "Rozliczane co rok" },

  // Free Starter
  freeName: { en: "Free Starter", fr: "Free Starter", uk: "Free Starter", pl: "Free Starter" },
  freeDesc: {
    en: "For those just starting or running a small private practice.",
    fr: "Pour ceux qui démarrent ou gèrent une petite pratique privée.",
    uk: "Для тих, хто тільки починає або веде невелику приватну практику.",
    pl: "Dla tych, którzy zaczynają lub prowadzą małą prywatną praktykę.",
  },
  freeBadgeForever: { en: "Free forever", fr: "Gratuit pour toujours", uk: "Безкоштовно назавжди", pl: "Za darmo na zawsze" },
  freeF1: { en: "Up to 5 active clients", fr: "Jusqu'à 5 clients actifs", uk: "До 5 активних клієнтів", pl: "Do 5 aktywnych klientów" },
  freeF2: { en: "All SoloBizz features included", fr: "Toutes les fonctionnalités SoloBizz incluses", uk: "Усі функції SoloBizz включені", pl: "Wszystkie funkcje SoloBizz w komplecie" },
  freeF3: { en: "Calendar, clients, payments, reminders", fr: "Calendrier, clients, paiements, rappels", uk: "Календар, клієнти, оплати, нагадування", pl: "Kalendarz, klienci, płatności, przypomnienia" },
  freeF4: { en: "Financial analytics & reports", fr: "Analytique financière et rapports", uk: "Фінансова аналітика та звіти", pl: "Analityka finansowa i raporty" },
  freeF5: { en: "Forever free, no card required", fr: "Gratuit pour toujours, sans carte", uk: "Назавжди безкоштовно, без картки", pl: "Za darmo na zawsze, bez karty" },
  freeCta: { en: "Start for free", fr: "Commencer gratuitement", uk: "Почати безкоштовно", pl: "Zacznij za darmo" },
  freeMicro: {
    en: "No card required.",
    fr: "Sans carte bancaire.",
    uk: "Без картки.",
    pl: "Bez karty.",
  },

  soloName: { en: "Solo Practice", fr: "Solo Practice", uk: "Solo Practice", pl: "Solo Practice" },
  soloDesc: {
    en: "Affordable plan for a small solo practice — manage clients, sessions and payments without chaos.",
    fr: "Forfait abordable pour une petite pratique solo — gérez clients, séances et paiements sans chaos.",
    uk: "Доступний тариф для невеликої сольної практики — ведення клієнтів, сесій та оплат без хаосу.",
    pl: "Przystępny plan dla małej, jednoosobowej praktyki — klienci, sesje i płatności bez chaosu.",
  },
  // Privacy / trust messaging used near pricing and CTAs
  privacyTitle: {
    en: "Your clients' data, fully private",
    fr: "Les données de vos clients, entièrement privées",
    uk: "Дані ваших клієнтів — повністю приватні",
    pl: "Dane Twoich klientów — w pełni prywatne",
  },
  privacyLong: {
    en: "Your client data stays private. SoloBizz does not read, analyze or use information about your clients. Client data is protected, and only the practice owner has access.",
    fr: "Les données de vos clients restent privées. SoloBizz ne consulte, n'analyse ni n'utilise les informations de vos clients. Les données sont protégées et seul le propriétaire de la pratique y a accès.",
    uk: "Ваші клієнтські дані залишаються приватними. SoloBizz не переглядає, не аналізує і не використовує інформацію про ваших клієнтів. Дані клієнтів захищені, а доступ до них має лише власник практики.",
    pl: "Twoje dane klientów pozostają prywatne. SoloBizz nie przegląda, nie analizuje i nie wykorzystuje informacji o Twoich klientach. Dane są chronione, a dostęp ma tylko właściciel praktyki.",
  },
  privacyShort: {
    en: "Your clients' data is protected. We don't see or use client information.",
    fr: "Les données de vos clients sont protégées. Nous ne voyons ni n'utilisons les informations clients.",
    uk: "Дані ваших клієнтів захищені. Ми не бачимо і не використовуємо клієнтську інформацію.",
    pl: "Dane Twoich klientów są chronione. Nie widzimy i nie wykorzystujemy informacji o klientach.",
  },
  soloIntro: {
    en: "All SoloBizz features included.",
    fr: "Toutes les fonctionnalités SoloBizz incluses.",
    uk: "Усі функції SoloBizz включені.",
    pl: "Wszystkie funkcje SoloBizz w komplecie.",
  },
  soloF1: { en: "Up to 20 active clients", fr: "Jusqu'à 20 clients actifs", uk: "До 20 активних клієнтів", pl: "Do 20 aktywnych klientów" },
  soloF2: { en: "Everything in Free Starter", fr: "Tout du Free Starter", uk: "Усе з Free Starter", pl: "Wszystko z Free Starter" },
  soloF3: { en: "Calendar, clients, payments, reminders", fr: "Calendrier, clients, paiements, rappels", uk: "Календар, клієнти, оплати, нагадування", pl: "Kalendarz, klienci, płatności, przypomnienia" },
  soloF4: { en: "Financial analytics & reports", fr: "Analytique financière et rapports", uk: "Фінансова аналітика та звіти", pl: "Analityka finansowa i raporty" },
  soloF5: { en: "Cancel anytime", fr: "Annulation à tout moment", uk: "Скасування будь-коли", pl: "Anulowanie w dowolnej chwili" },
  soloCta: { en: "Choose Solo Practice", fr: "Choisir Solo Practice", uk: "Обрати Solo Practice", pl: "Wybierz Solo Practice" },
  soloBadge: {
    en: "Best for private practice",
    fr: "Idéal pour la pratique privée",
    uk: "Найкраще для приватної практики",
    pl: "Najlepsze dla prywatnej praktyki",
  },

  proName: { en: "Pro Practice", fr: "Pro Practice", uk: "Pro Practice", pl: "Pro Practice" },
  proDesc: {
    en: "Advanced practice management — more active clients, group sessions, supervision and full financial control.",
    fr: "Gestion avancée — plus de clients actifs, séances de groupe, supervision et contrôle financier complet.",
    uk: "Розширене керування практикою — більше активних клієнтів, групові сесії, супервізія і повний фінансовий контроль.",
    pl: "Zaawansowane zarządzanie praktyką — więcej aktywnych klientów, sesje grupowe, superwizja i pełna kontrola finansów.",
  },
  proIntro: {
    en: "All SoloBizz features included.",
    fr: "Toutes les fonctionnalités SoloBizz incluses.",
    uk: "Усі функції SoloBizz включені.",
    pl: "Wszystkie funkcje SoloBizz w komplecie.",
  },
  proF1: { en: "Unlimited active clients", fr: "Clients actifs illimités", uk: "Без ліміту активних клієнтів", pl: "Bez limitu aktywnych klientów" },
  proF2: { en: "Everything in Solo Practice", fr: "Tout du Solo Practice", uk: "Усе з Solo Practice", pl: "Wszystko z Solo Practice" },
  proF3: { en: "Priority support", fr: "Support prioritaire", uk: "Пріоритетна підтримка", pl: "Wsparcie priorytetowe" },
  proF4: { en: "Custom onboarding consultations", fr: "Consultations d'onboarding personnalisées", uk: "Індивідуальні консультації з налаштування", pl: "Indywidualne konsultacje wdrożeniowe" },
  proF5: { en: "For scaling practices & teams", fr: "Pour les pratiques et équipes en croissance", uk: "Для практик і команд, що масштабуються", pl: "Dla skalujących się praktyk i zespołów" },
  proCta: { en: "Choose Pro Practice", fr: "Choisir Pro Practice", uk: "Обрати Pro Practice", pl: "Wybierz Pro Practice" },
  proBadge: {
    en: "For a scaling practice",
    fr: "Pour une pratique en croissance",
    uk: "Для практики, що масштабується",
    pl: "Dla skalującej się praktyki",
  },

  // Inline pricing FAQ
  pfaq1Q: {
    en: "Do paid plans unlock extra features?",
    fr: "Les forfaits payants débloquent-ils des fonctionnalités supplémentaires ?",
    uk: "Чи відкривають платні плани додаткові функції?",
    pl: "Czy plany płatne odblokowują dodatkowe funkcje?",
  },
  pfaq1A: {
    en: "No. SoloBizz is one complete system — every feature is available on every plan, including Free Starter. Paid plans only raise the active-client limit and add priority support on Pro.",
    fr: "Non. SoloBizz est un système complet — toutes les fonctionnalités sont disponibles sur chaque forfait, y compris Free Starter. Les forfaits payants augmentent uniquement la limite de clients actifs et ajoutent le support prioritaire sur Pro.",
    uk: "Ні. SoloBizz — це одна повна система: усі функції доступні на кожному плані, включно з Free Starter. Платні плани лише збільшують ліміт активних клієнтів і додають пріоритетну підтримку на Pro.",
    pl: "Nie. SoloBizz to jeden kompletny system — wszystkie funkcje są dostępne w każdym planie, łącznie z Free Starter. Plany płatne tylko zwiększają limit aktywnych klientów i dodają wsparcie priorytetowe w Pro.",
  },
  pfaq2Q: {
    en: "What happens when I add a 6th client?",
    fr: "Que se passe-t-il quand j'ajoute un 6ᵉ client ?",
    uk: "Що станеться, коли я додам 6-го клієнта?",
    pl: "Co się stanie, gdy dodam 6. klienta?",
  },
  pfaq2A: {
    en: "The system suggests upgrading to a plan with a higher active-client limit. Your data and settings stay — only the limit changes.",
    fr: "Le système vous propose de passer à un forfait avec une limite plus élevée. Vos données et réglages restent — seule la limite change.",
    uk: "Система запропонує перейти на план із вищим лімітом активних клієнтів. Дані та налаштування залишаються — змінюється лише ліміт.",
    pl: "System zaproponuje przejście na plan z wyższym limitem aktywnych klientów. Dane i ustawienia zostają — zmienia się tylko limit.",
  },
  pfaq3Q: {
    en: "Can I cancel my subscription?",
    fr: "Puis-je annuler mon abonnement ?",
    uk: "Чи можна скасувати підписку?",
    pl: "Czy mogę anulować subskrypcję?",
  },
  pfaq3A: {
    en: "Yes, you can cancel anytime. Free Starter remains available within its 5 active client limit.",
    fr: "Oui, vous pouvez annuler à tout moment. Free Starter reste disponible dans la limite de 5 clients actifs.",
    uk: "Так, скасувати можна будь-коли. Free Starter залишається доступним у межах ліміту 5 активних клієнтів.",
    pl: "Tak, możesz anulować w dowolnej chwili. Free Starter pozostaje dostępny w ramach limitu 5 aktywnych klientów.",
  },

  // ROI / time saving — comparison tiles
  roiTilesTitle: {
    en: "What manual admin can cost you",
    fr: "Ce que peut coûter l'admin manuelle",
    uk: "Що може коштувати ручна адмінка",
    pl: "Ile może kosztować ręczna administracja",
  },
  roiT1Value: { en: "4–8+ hrs/week", fr: "4–8+ h/semaine", uk: "4–8+ год/тиждень", pl: "4–8+ godz./tydz." },
  roiT1Sub: {
    en: "manual admin can take with 20+ clients",
    fr: "que l'admin manuelle peut prendre avec 20+ clients",
    uk: "може забирати ручна адмінка при 20+ клієнтах",
    pl: "może zajmować ręczna administracja przy 20+ klientach",
  },
  roiT2Value: { en: "~10% of time", fr: "~10 % du temps", uk: "10% часу", pl: "~10% czasu" },
  roiT2Sub: {
    en: "can go on bookings, payments, messages and reconciling data",
    fr: "peut partir en RDV, paiements, messages et rapprochements",
    uk: "може йти на записи, оплати, комунікацію та звірку даних",
    pl: "może iść na zapisy, płatności, komunikację i uzgadnianie danych",
  },
  roiT3Value: { en: "5 min", fr: "5 min", uk: "5 хв", pl: "5 min" },
  roiT3Sub: {
    en: "to add a client, session or payment — without Excel",
    fr: "pour ajouter un client, une séance ou un paiement — sans Excel",
    uk: "щоб додати клієнта, сесію або оплату без Excel",
    pl: "by dodać klienta, sesję lub płatność — bez Excela",
  },

  // FAQ extra (time saving)
  faq7Q: {
    en: "How much time can SoloBizz save?",
    fr: "Combien de temps SoloBizz peut-il faire gagner ?",
    uk: "Скільки часу SoloBizz може зекономити?",
    pl: "Ile czasu może zaoszczędzić SoloBizz?",
  },
  faq7A: {
    en: "If you keep clients, sessions, payments and debts manually, admin work can take several hours a week — especially with 20+ clients in your practice. SoloBizz brings these processes into one place: calendar, clients, payments, debts and a financial overview.",
    fr: "Si vous gérez clients, séances, paiements et créances à la main, l'admin peut prendre plusieurs heures par semaine — surtout avec 20+ clients. SoloBizz regroupe ces processus au même endroit : calendrier, clients, paiements, créances et vue financière.",
    uk: "Якщо вести клієнтів, сесії, оплати й борги вручну, адміністративна робота може забирати кілька годин на тиждень, особливо коли у практиці вже 20+ клієнтів. SoloBizz допомагає зібрати ці процеси в одному місці: календар, клієнти, оплати, борги й фінансовий огляд.",
    pl: "Jeśli klientów, sesje, płatności i długi prowadzisz ręcznie, administracja może zajmować kilka godzin w tygodniu — zwłaszcza gdy masz 20+ klientów. SoloBizz łączy te procesy w jednym miejscu: kalendarz, klienci, płatności, długi i przegląd finansowy.",
  },

  // Pricing value microcopy
  pricingValue: {
    en: "You're not paying for another tool. You're getting back the hours that now go to spreadsheets, messages, payment checks and manual calculations.",
    fr: "Vous ne payez pas un outil de plus. Vous récupérez les heures qui partent aujourd'hui en tableurs, messages, vérification des paiements et calculs manuels.",
    uk: "Ви платите не за ще один інструмент. Ви повертаєте собі години, які зараз ідуть на таблиці, повідомлення, перевірку оплат і ручні підрахунки.",
    pl: "Nie płacisz za kolejne narzędzie. Odzyskujesz godziny, które dziś idą na arkusze, wiadomości, sprawdzanie płatności i ręczne obliczenia.",
  },
  pricingValueNote: {
    en: "Free Starter — free forever for up to 5 active clients.",
    fr: "Free Starter — gratuit pour toujours jusqu'à 5 clients actifs.",
    uk: "Free Starter — безкоштовно назавжди до 5 активних клієнтів.",
    pl: "Free Starter — za darmo na zawsze dla maks. 5 aktywnych klientów.",
  },

  testTitle: {
    en: "Psychologists are already testing SoloBizz in their practice",
    fr: "Des psychologues testent déjà SoloBizz dans leur cabinet",
    uk: "Психологи вже тестують SoloBizz у своїй практиці",
    pl: "Psycholodzy już testują SoloBizz w swojej praktyce",
  },
  testSub: {
    en: "Original feedback from the first users who are already trying the system in their work.",
    fr: "Retours originaux des premiers utilisateurs qui essaient déjà le système dans leur travail.",
    uk: "Оригінальні відгуки перших користувачів, які вже пробують систему у своїй роботі.",
    pl: "Oryginalne opinie pierwszych użytkowników, którzy już próbują systemu w swojej pracy.",
  },
  testReadMore: { en: "Read full", fr: "Lire la suite", uk: "Читати повністю", pl: "Czytaj całość" },
  testReadLess: { en: "Show less", fr: "Réduire", uk: "Згорнути", pl: "Zwiń" },
  test1Q: {
    en: "I finally see who paid, who owes, and how much I really earned this month.",
    fr: "Je vois enfin qui a payé, qui me doit, et combien j'ai vraiment gagné ce mois-ci.",
    uk: "Я нарешті бачу, хто оплатив, хто має борг і скільки я реально заробила за місяць.",
    pl: "Wreszcie widzę, kto zapłacił, kto ma dług i ile naprawdę zarobiłam w tym miesiącu.",
  },
  test1A: { en: "Psychotherapist, private practice", fr: "Psychothérapeute, cabinet privé", uk: "Психотерапевт, приватна практика", pl: "Psychoterapeutka, prywatna praktyka" },
  test2Q: {
    en: "I used to keep bookings in the calendar, payments in a spreadsheet and notes separately. Now everything is in one place.",
    fr: "Avant : agenda pour les RDV, tableur pour les paiements, notes ailleurs. Maintenant, tout est au même endroit.",
    uk: "Раніше я тримала записи в календарі, оплату в таблиці, а нотатки окремо. Тепер усе зібрано в одному місці.",
    pl: "Wcześniej miałam zapisy w kalendarzu, płatności w arkuszu, a notatki osobno. Teraz wszystko jest w jednym miejscu.",
  },
  test2A: { en: "Counseling psychologist", fr: "Psychologue conseil", uk: "Психолог-консультант", pl: "Psycholog-konsultant" },
  test3Q: {
    en: "For group classes it became easier to see attendance and payments of participants.",
    fr: "Pour les séances de groupe, voir les présences et les paiements des participants est devenu simple.",
    uk: "Для групових занять стало простіше бачити присутність і оплати учасників.",
    pl: "W grupach łatwiej widać obecność i płatności uczestników.",
  },
  test3A: { en: "Supervisor / teacher", fr: "Superviseur / enseignant", uk: "Супервізор / викладач", pl: "Superwizor / wykładowca" },

  // FAQ
  faqTitle: { en: "Frequently asked questions", fr: "Questions fréquentes", uk: "Питання, які часто виникають", pl: "Często zadawane pytania" },
  faq1Q: { en: "Is it hard to start using SoloBizz?", fr: "Est-ce compliqué de démarrer avec SoloBizz ?", uk: "Чи складно почати користуватись SoloBizz?", pl: "Czy trudno zacząć korzystać z SoloBizz?" },
  faq1A: {
    en: "No. Sign up with the Free Starter plan and start using SoloBizz right away — no setup required.",
    fr: "Non. Inscrivez-vous avec le plan Free Starter et commencez tout de suite — sans configuration.",
    uk: "Ні. Зареєструйтеся з планом Free Starter і почніть користуватись одразу — без складних налаштувань.",
    pl: "Nie. Zarejestruj się z planem Free Starter i zacznij od razu — bez konfiguracji.",
  },
  faq2Q: { en: "Will it work if I work alone?", fr: "Est-ce adapté si je travaille seul·e ?", uk: "Чи підійде система, якщо я працюю сама?", pl: "Czy nada się, jeśli pracuję sam(a)?" },
  faq2A: {
    en: "Yes. SoloBizz is built exactly for solo practices where one person manages clients, sessions, payments and finances.",
    fr: "Oui. SoloBizz est conçu pour les pratiques solo où une seule personne gère clients, séances, paiements et finances.",
    uk: "Так. SoloBizz створений саме для приватних практик, де одна людина веде клієнтів, сесії, оплати й фінанси.",
    pl: "Tak. SoloBizz powstał właśnie dla solowych praktyk, gdzie jedna osoba prowadzi klientów, sesje, płatności i finanse.",
  },
  faq3Q: { en: "Can I run group sessions or supervisions?", fr: "Puis-je gérer des séances de groupe ou des supervisions ?", uk: "Чи можна вести групові сесії або супервізії?", pl: "Czy mogę prowadzić sesje grupowe lub superwizje?" },
  faq3A: {
    en: "Yes. The system supports individual and group sessions, attendance and payment control.",
    fr: "Oui. Le système gère séances individuelles et de groupe, présence et paiements.",
    uk: "Так. Система підтримує індивідуальні та групові сесії, контроль присутності й оплат.",
    pl: "Tak. System obsługuje sesje indywidualne i grupowe, kontrolę obecności i płatności.",
  },
  faq4Q: { en: "Can I use it for teaching or tutoring?", fr: "Puis-je l'utiliser pour l'enseignement ou les cours particuliers ?", uk: "Чи можна використовувати систему для викладання або репетиторства?", pl: "Czy mogę używać go do nauczania lub korepetycji?" },
  faq4A: {
    en: "Yes. The system fits specialists who work with students, lessons, payments and learning progress.",
    fr: "Oui. Le système convient aux pros qui suivent élèves, cours, paiements et progression.",
    uk: "Так. Система підходить для спеціалістів, які працюють з учнями, заняттями, оплатами та прогресом навчання.",
    pl: "Tak. System pasuje dla osób pracujących z uczniami, zajęciami, płatnościami i postępami nauki.",
  },
  faq5Q: { en: "Is SoloBizz really free?", fr: "SoloBizz est-il vraiment gratuit ?", uk: "Чи справді SoloBizz безкоштовний?", pl: "Czy SoloBizz jest naprawdę darmowy?" },
  faq5A: {
    en: "Yes. The Free Starter plan is permanently free for up to 5 active clients, with no time limit.",
    fr: "Oui. Le plan Free Starter est gratuit en permanence jusqu'à 5 clients actifs, sans limite de temps.",
    uk: "Так. План Free Starter безкоштовний назавжди для до 5 активних клієнтів, без обмеження по часу.",
    pl: "Tak. Plan Free Starter jest na stałe darmowy dla maks. 5 aktywnych klientów, bez limitu czasu.",
  },
  faq6Q: { en: "Do I need a credit card to start?", fr: "Faut-il une carte bancaire pour commencer ?", uk: "Чи потрібна банківська картка, щоб почати?", pl: "Czy potrzebuję karty, żeby zacząć?" },
  faq6A: {
    en: "No. The Free Starter plan does not require a credit card.",
    fr: "Non. Le plan Free Starter ne nécessite pas de carte bancaire.",
    uk: "Ні. Для плану Free Starter картка не потрібна.",
    pl: "Nie. Plan Free Starter nie wymaga karty.",
  },

  // Final
  finalTitle1: { en: "You can keep working in chaos.", fr: "Vous pouvez continuer dans le chaos.", uk: "Можна й далі працювати в хаосі.", pl: "Możesz dalej pracować w chaosie." },
  finalTitle2: { en: "Or take control today.", fr: "Ou prendre le contrôle aujourd'hui.", uk: "Або взяти контроль уже сьогодні.", pl: "Albo przejąć kontrolę już dziś." },
  finalDesc: {
    en: "SoloBizz helps you see clients, bookings, payments, income and profit in one clear system.",
    fr: "SoloBizz vous montre clients, RDV, paiements, revenus et bénéfice dans un système clair.",
    uk: "SoloBizz допомагає бачити клієнтів, записи, оплати, дохід і прибуток в одній зрозумілій системі.",
    pl: "SoloBizz pomaga widzieć klientów, zapisy, płatności, dochód i zysk w jednym czytelnym systemie.",
  },
  finalCta: { en: "Try it now", fr: "Essayer maintenant", uk: "Спробувати зараз", pl: "Wypróbuj teraz" },
  doubtTitle: { en: "Still in doubt?", fr: "Encore des doutes ?", uk: "Залишились сумніви?", pl: "Masz wątpliwości?" },
  doubtText: {
    en: "Book a short call and we'll show how SoloBizz can simplify your work and reveal where profit gets lost.",
    fr: "Réservez un court échange : nous vous montrerons comment SoloBizz simplifie votre travail et révèle les pertes de bénéfice.",
    uk: "Запишіться на коротку розмову, і ми покажемо, як SoloBizz може спростити вашу роботу та показати, де губиться прибуток.",
    pl: "Zarezerwuj krótką rozmowę — pokażemy, jak SoloBizz uprości pracę i odsłoni, gdzie znika zysk.",
  },
  doubtCta: { en: "Talk to us", fr: "Discuter", uk: "Поспілкуватися", pl: "Porozmawiaj" },
} satisfies Record<string, Copy>;

type CopyKey = keyof typeof C;

// ── Local i18n provider ───────────────────────────────────────────────

const LandingLangContext = createContext<{
  lang: Language;
  t: (key: CopyKey) => string;
  toggle: () => void;
}>({ lang: "en", t: (k) => k as string, toggle: () => {} });

function useLandingLang() {
  return useContext(LandingLangContext);
}

const LANG_CYCLE: Language[] = ["en", "fr", "uk", "pl"];

export function LandingLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => getStoredLang());
  // Stay in sync with the global LanguageProvider so toggles anywhere update copy here.
  useEffect(() => {
    const sync = () => setLang(getStoredLang());
    window.addEventListener("app_lang_change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("app_lang_change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = useCallback(() => {
    setLang((prev) => {
      const idx = LANG_CYCLE.indexOf(prev);
      const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
      setPreLoginLang(next);
      return next;
    });
  }, []);
  const t = useCallback(
    (key: CopyKey): string => {
      const entry = C[key];
      return entry[lang] || entry.en;
    },
    [lang]
  );
  return (
    <LandingLangContext.Provider value={{ lang, t, toggle }}>
      {children}
    </LandingLangContext.Provider>
  );
}

// ── Billing cycle context (shared with pricing + CTA analytics) ───────

type Cycle = "monthly" | "quarterly" | "yearly";
const BillingCycleContext = createContext<Cycle>("monthly");
const useBillingCycle = () => useContext(BillingCycleContext);

// ── Reusable CTA helpers ──────────────────────────────────────────────

function PrimaryCta({
  label, source, cta, size = "lg", className = "", extra,
}: {
  label: string;
  source: string;
  cta: string;
  size?: "sm" | "lg" | "default";
  className?: string;
  extra?: Record<string, unknown>;
}) {
  const { lang } = useLandingLang();
  const billing_cycle = useBillingCycle();
  return (
    <Link
      to="/auth?mode=signup"
      onClick={() =>
        track("cta_clicked", { source_page: source, cta, lang, billing_cycle, ...extra })
      }
    >
      <Button size={size} className={`gap-2 ${className}`}>
        {label} <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );
}


// ── Nav ───────────────────────────────────────────────────────────────

function LandingNav() {
  const { lang, t, toggle } = useLandingLang();
  const links = [
    { label: t("navAudience"), href: "#audience" },
    { label: t("navHow"), href: "#comparison" },
    { label: t("navPricing"), href: "#pricing" },
    { label: t("navFaq"), href: "#faq" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-foreground tracking-tight">
          Solo<span className="text-primary">Bizz</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="px-2.5 py-1 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
            aria-label="Switch language"
            title={`Language: ${lang.toUpperCase()}`}
          >
            {lang === "en" ? "🇬🇧 EN" : lang === "fr" ? "🇫🇷 FR" : lang === "pl" ? "🇵🇱 PL" : "🇺🇦 UA"}
          </button>
          <Link to="/auth" className="hidden sm:block">
            <Button variant="ghost" size="sm">{t("navLogin")}</Button>
          </Link>
          <Link to="/auth" onClick={() => track("cta_clicked", { source_page: "/", cta: "nav", lang })}>
            <Button size="sm">{t("navTry")}</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}


// ── Hero ──────────────────────────────────────────────────────────────

function HeroSection() {
  const { t } = useLandingLang();
  return (
    <section className="pt-40 pb-28 sm:pt-44 sm:pb-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-10 leading-normal">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="leading-normal">{t("heroBadge")}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.1] mb-8 max-w-5xl mx-auto">
          <span className="block">{t("heroTitlePrefix")}</span>
          <span className="block text-primary mt-2">{t("heroTitleAccent")}</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
          {t("heroSub")}
        </p>
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PrimaryCta label={t("heroCta")} source="/" cta="hero" className="text-base px-8 h-12" />
            <a
              href="#pricing"
              className="inline-flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 h-12"
            >
              {t("heroSecondary")}
            </a>
          </div>
          <p className="text-sm text-muted-foreground">{t("heroSubCta")}</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs sm:text-sm text-muted-foreground mt-4">
            <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> {t("trustData")}</li>
            <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> {t("trustStripe")}</li>
            <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> {t("trustGdpr")}</li>
            <li className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4 text-success" /> {t("trustSupport")}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Stats (integrated at top of dark navy section) ─────────────────────

function StatsSection() {
  const { t } = useLandingLang();
  const stats = [
    { num: "300+", label: t("statsTherapists") },
    { num: "4–8 год", label: t("statsTime") },
    { num: "15 хв", label: t("statsSetup") },
  ];
  return (
    <section className="bg-secondary text-secondary-foreground px-4 sm:px-6 pt-14 pb-10 sm:pt-16 sm:pb-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-white/10 gap-8 sm:gap-0">
          {stats.map((s) => (
            <div key={s.num} className="text-center px-4">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-3 tracking-tight">{s.num}</div>
              <div className="text-sm sm:text-base text-secondary-foreground/80 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-secondary-foreground/80 text-center px-4">
          <span>✦ {t("setupAssist")}</span>
        </div>
      </div>
    </section>
  );
}

// ── Pain ──────────────────────────────────────────────────────────────

function PainSection() {
  const { t } = useLandingLang();
  const items: CopyKey[] = ["pain1", "pain2", "pain3", "pain4", "pain5", "pain6"];
  return (
    <section className="pt-8 pb-20 px-4 sm:px-6 bg-secondary">
      <div className="max-w-3xl mx-auto">
        <p className="text-lg sm:text-xl font-semibold text-primary text-center mb-3">
          {t("painTitle")}
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground text-center mb-10">
          {t("painHeadline")}
        </h2>
        <div className="space-y-3 mb-10">
          {items.map((key) => (
            <div key={key} className="flex items-start gap-4 p-4 rounded-xl bg-accent/40 border border-sidebar-border">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-base sm:text-lg text-secondary-foreground/90 font-medium">{t(key)}</p>
            </div>
          ))}
        </div>
        <div className="text-center mb-8">
          <p className="text-xl sm:text-2xl font-bold text-secondary-foreground">{t("painBottom")}</p>
        </div>
        <div className="flex justify-center">
          <PrimaryCta label={t("painCta")} source="/#pain" cta="pain" className="text-base px-8 h-12" />
        </div>
      </div>
    </section>
  );
}

// ── What Changes ───────────────────────────────────────────────────────

function WhatChangesSection() {
  const { t } = useLandingLang();
  const withoutItems: CopyKey[] = [
    "whatChangesWithout1",
    "whatChangesWithout2",
    "whatChangesWithout3",
    "whatChangesWithout4",
    "whatChangesWithout5",
    "whatChangesWithout6",
  ];
  const withItems: CopyKey[] = [
    "whatChangesWith1",
    "whatChangesWith2",
    "whatChangesWith3",
    "whatChangesWith4",
    "whatChangesWith5",
    "whatChangesWith6",
  ];
  return (
    <section id="comparison" className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-4">
            {t("whatChangesEyebrow")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {t("whatChangesHeadline")}
          </h2>
          <p className="text-lg text-muted-foreground">{t("whatChangesSub")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Without SoloBizz card */}
          <div className="relative flex flex-col p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl sm:text-2xl font-semibold text-muted-foreground">
                {t("whatChangesWithoutTitle")}
              </h3>
              <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-destructive/10 text-destructive">
                {t("cmpManualBadge")}
              </span>
            </div>
            <ul className="space-y-3.5 flex-1">
              {withoutItems.map((k) => (
                <li key={k} className="flex items-start gap-3 text-foreground/80">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                    <X className="h-4 w-4 text-destructive" />
                  </span>
                  <span className="text-base leading-relaxed">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* With SoloBizz card — green success accent */}
          <div className="relative flex flex-col p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-card to-emerald-50/60 dark:from-emerald-950/30 dark:via-card dark:to-emerald-950/20 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("whatChangesWithTitle")}
              </h3>
              <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                {t("cmpSoloBadge")}
              </span>
            </div>
            <ul className="space-y-3.5 flex-1">
              {withItems.map((k) => (
                <li key={k} className="flex items-start gap-3 text-foreground">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 shrink-0">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <span className="text-base leading-relaxed font-medium">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center max-w-[760px] mx-auto">
          <p className="text-lg sm:text-xl font-semibold text-foreground leading-relaxed">
            {(() => {
              const full = t("whatChangesSummary");
              const hi = t("whatChangesSummaryHighlight");
              const idx = full.toLowerCase().indexOf(hi.toLowerCase());
              if (idx === -1) return full;
              return (
                <>
                  {full.slice(0, idx)}
                  <span className="text-primary font-bold">{full.slice(idx, idx + hi.length)}</span>
                  {full.slice(idx + hi.length)}
                </>
              );
            })()}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <PrimaryCta
              label={t("whatChangesCta")}
              source="/"
              cta="what_changes_cta"
              className="rounded-full px-8"
            />
            <p className="text-sm text-muted-foreground">{t("whatChangesCtaNote")}</p>
          </div>
        </div>

      </div>
    </section>
  );
}

// ── Features / What's included ────────────────────────────────────────

function FeaturesSection() {
  const { t } = useLandingLang();
  const cards: { icon: React.ComponentType<{ className?: string }>; titleKey: CopyKey; descKey: CopyKey }[] = [
    { icon: Contact, titleKey: "feat1Title", descKey: "feat1Desc" },
    { icon: CalendarIcon, titleKey: "feat2Title", descKey: "feat2Desc" },
    { icon: Link2, titleKey: "feat3Title", descKey: "feat3Desc" },
    { icon: Bell, titleKey: "feat4Title", descKey: "feat4Desc" },
    { icon: CreditCard, titleKey: "feat5Title", descKey: "feat5Desc" },
    { icon: ReceiptText, titleKey: "feat6Title", descKey: "feat6Desc" },
    { icon: BarChart3, titleKey: "feat7Title", descKey: "feat7Desc" },
    { icon: ClipboardCheck, titleKey: "feat8Title", descKey: "feat8Desc" },
    { icon: ShieldCheck, titleKey: "feat9Title", descKey: "feat9Desc" },
    { icon: Calculator, titleKey: "feat10Title", descKey: "feat10Desc" },
    { icon: MessagesSquare, titleKey: "feat11Title", descKey: "feat11Desc" },
    { icon: Route, titleKey: "feat12Title", descKey: "feat12Desc" },
  ];
  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-primary mb-4">
            {t("featEyebrow")}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5 leading-tight">
            {t("featHeadline")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("featSub")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {cards.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="flex flex-col p-7 sm:p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2 leading-snug">
                {t(titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 sm:mt-14 flex flex-col items-center gap-3 text-center">
          <PrimaryCta
            label={t("featCta")}
            source="/"
            cta="features_cta"
            className="rounded-full px-8"
          />
          <p className="text-sm text-muted-foreground">{t("featCtaNote")}</p>
        </div>
      </div>
    </section>
  );
}





// ── Pricing ───────────────────────────────────────────────────────────

type PaidPlan = "solo" | "pro";
type PlanRow = {
  id: PaidPlan;
  name: string;
  desc: string;
  intro?: string;
  bullets: string[];
  cta: string;
  badge?: string;
  highlighted?: boolean;
  // base monthly price (used to compute amount per cycle and equivalents)
  monthly: number;
  quarterly: number; // amount billed every 3 months
  yearly: number;    // amount billed every 12 months
};

function fmtEuro(n: number): string {
  if (n === 0) return "€0";
  return Number.isInteger(n) ? `€${n}` : `€${n.toFixed(2)}`;
}

function PricingSection() {
  const { t } = useLandingLang();
  const [cycle, setCycle] = useState<Cycle>("monthly");

  const plans: PlanRow[] = [
    {
      id: "solo",
      name: t("soloName"),
      desc: t("soloDesc"),
      intro: t("soloIntro"),
      bullets: [t("soloF1"), t("soloF2"), t("soloF3"), t("soloF4"), t("soloF5")],
      cta: t("soloCta"),
      badge: t("soloBadge"),
      highlighted: true,
      monthly: 5,
      quarterly: 12,
      yearly: 36,
    },
    {
      id: "pro",
      name: t("proName"),
      desc: t("proDesc"),
      intro: t("proIntro"),
      bullets: [t("proF1"), t("proF2"), t("proF3"), t("proF4"), t("proF5")],
      cta: t("proCta"),
      badge: t("proBadge"),
      monthly: 19,
      quarterly: 45.6,
      yearly: 136.8,
    },
  ];

  const tabs: { id: Cycle; label: string; badge?: string }[] = [
    { id: "monthly", label: t("monthly") },
    { id: "quarterly", label: t("quarterly"), badge: t("save20") },
    { id: "yearly", label: t("yearly"), badge: t("save40") },
  ];

  const billedLabel = cycle === "monthly" ? t("billedMo") : cycle === "quarterly" ? t("billedQ") : t("billedY");
  const periodSuffix = cycle === "monthly" ? t("perMonth") : cycle === "quarterly" ? t("perQuarter") : t("perYear");

  return (
    <BillingCycleContext.Provider value={cycle}>
    <section id="pricing" className="py-20 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("pricingTitle")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("pricingSub")}</p>
        </div>

        <div className="max-w-3xl mx-auto mb-10 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6 flex items-start gap-3">
          <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="text-base text-foreground/90 leading-relaxed">{t("pricingValue")}</p>
            <p className="text-sm text-muted-foreground mt-2">{t("pricingValueNote")}</p>
          </div>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-border">
            {tabs.map((tab) => {
              const active = cycle === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCycle(tab.id);
                    track("pricing_cycle_changed", { billing_cycle: tab.id });
                  }}
                  className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Privacy / trust block — placed near pricing to reduce hesitation */}
        <div className="max-w-3xl mx-auto mb-10 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-transparent p-5 sm:p-6 flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold text-foreground">{t("privacyTitle")}</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t("privacyLong")}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {/* Free Starter card */}
          <div className="relative p-7 rounded-2xl bg-card border-2 border-border flex flex-col">
            <h3 className="text-xl font-semibold text-foreground">{t("freeName")}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">{t("freeDesc")}</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-foreground">€0</span>
              <span className="text-muted-foreground text-base">{t("perMonth")}</span>
            </div>
            <p className="text-xs font-semibold text-primary mb-1">{t("freeBadgeForever")}</p>
            <p className="text-xs text-muted-foreground mb-6">{t("freeMicro")}</p>
            <ul className="space-y-2.5 mb-7 flex-1">
              {[t("freeF1"), t("freeF2"), t("freeF3"), t("freeF4"), t("freeF5")].map((f) => (
                <li key={f} className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/auth?mode=signup"
              onClick={() =>
                track("cta_clicked", { source_page: `/#pricing-${cycle}-free`, cta: "free_starter_selected", plan_type: "free_starter", billing_cycle: cycle })
              }
              className="block mt-auto"
            >
              <Button className="w-full h-11 gap-2 bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2">
                {t("freeCta")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              cycle={cycle}
              billedLabel={billedLabel}
              periodSuffix={periodSuffix}
            />
          ))}
        </div>

        {/* Short privacy reassurance close to plan CTAs */}
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t("privacyShort")}
        </p>

        {/* Inline pricing FAQ */}
        <div className="mt-12 max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card divide-y divide-border">
            {[
              { q: "pfaq1Q" as CopyKey, a: "pfaq1A" as CopyKey },
              { q: "pfaq2Q" as CopyKey, a: "pfaq2A" as CopyKey },
              { q: "pfaq3Q" as CopyKey, a: "pfaq3A" as CopyKey },
            ].map((it, idx) => (
              <AccordionItem key={it.q} value={`pfaq-${idx}`} className="border-0 px-5">
                <AccordionTrigger
                  onClick={() =>
                    track("cta_clicked", { source_page: "/#pricing", cta: "landing_pricing_faq_open", plan_type: it.q })
                  }
                  className="text-left text-base font-semibold text-foreground"
                >
                  {t(it.q)}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {t(it.a)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
    </BillingCycleContext.Provider>
  );
}

function PlanCard({
  plan, cycle, billedLabel, periodSuffix,
}: {
  plan: PlanRow;
  cycle: Cycle;
  billedLabel: string;
  periodSuffix: string;
}) {
  const { lang, t } = useLandingLang();
  const amount = cycle === "monthly" ? plan.monthly : cycle === "quarterly" ? plan.quarterly : plan.yearly;
  const equiv = cycle === "monthly"
    ? null
    : cycle === "quarterly"
      ? plan.quarterly / 3
      : plan.yearly / 12;
  const equivStr = equiv ? t("equivalentTo").replace("{price}", fmtEuro(Number(equiv.toFixed(2)))) : null;
  const popular = plan.highlighted;
  return (
    <div className={`relative p-7 rounded-2xl bg-card border-2 flex flex-col ${
      popular ? "border-primary shadow-lg" : "border-border"
    }`}>
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap">
          {plan.badge}
        </span>
      )}
      <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-5">{plan.desc}</p>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-4xl font-bold text-foreground">{fmtEuro(amount)}</span>
        <span className="text-muted-foreground text-base">{periodSuffix}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{billedLabel}</p>
      {equivStr && <p className="text-xs text-primary font-medium mb-5">{equivStr}</p>}
      {!equivStr && <div className="mb-5" />}
      {plan.intro && (
        <p className="text-sm font-semibold text-foreground mb-3">{plan.intro}</p>
      )}
      <ul className="space-y-2.5 mb-7 flex-1">
        {plan.bullets.map((f) => (
          <li key={f} className="flex items-start gap-3 text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span className="text-sm">{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to={`/auth?plan=${plan.id}_${cycle}`}
        onClick={() =>
          track("cta_clicked", {
            source_page: `/#pricing-${cycle}-${plan.id}`,
            cta: "upgrade_plan_selected",
            plan_type: plan.id,
            billing_cycle: cycle,
            lang,
          })
        }
        className="block mt-auto"
      >
        <Button className="w-full h-11 gap-2" variant={popular ? "default" : "outline"}>
          {plan.cta} <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────

const NATALIA_PARAGRAPHS: Record<Language, string[]> = {
  uk: [
    "Справді вона бере на себе частину роботи, яку я зараз виконую вручну в блокнотику, і там все почьоркано)).",
    "Класно, що працює нагадування і для психолога і для клієнта, правда ще не розібралась чи може клієнт бачити вільні віконечка для запису, це було би зручно.",
    "Графіки за підсумками місяця чи року дають загальну картину куди я рухаюсь, яка динаміка, і що можна планувати на потім.",
    "Цікава штука з прогнозуванням прибутку, це щось нове для мене, особливо сподобалось що це прогнозування дає реалістину картинку: то можу я дозволити собі навчання цього місяця чи нє?))",
    "Загалом, виглядає що програмка дає відчуття: все серйозно, це бізнес дєтка, і це хороше відчуття, воно справді потрібне для системного розвитку.",
    "Впевнена, це буде корисно для багатьох фахівців",
  ],
  en: [
    "It really takes over part of the work I currently do by hand in a notebook, where everything is scribbled over)).",
    "It's great that reminders work both for the therapist and the client — though I haven't yet figured out whether the client can see the free time slots for booking, that would be convenient.",
    "The monthly and yearly charts give the big picture of where I'm heading, what the dynamics are, and what I can plan for later.",
    "The profit forecasting is an interesting thing, something new for me — I especially liked that the forecast gives a realistic picture: can I afford training this month or not?))",
    "Overall, it feels like the app gives you the sense: this is serious, this is business, baby — and that's a good feeling, you really need it for systematic growth.",
    "I'm sure it will be useful for many specialists.",
  ],
  fr: [
    "Elle prend vraiment en charge une partie du travail que je fais aujourd'hui à la main dans un carnet, où tout est rayé)).",
    "C'est super que les rappels fonctionnent à la fois pour le psy et pour le client, mais je n'ai pas encore compris si le client peut voir les créneaux libres pour la prise de rendez-vous — ce serait pratique.",
    "Les graphiques mensuels et annuels donnent une vision globale de la direction que je prends, de la dynamique et de ce que je peux planifier ensuite.",
    "La prévision des bénéfices est une chose intéressante, c'est nouveau pour moi — j'ai surtout aimé que la prévision donne une image réaliste : est-ce que je peux me permettre une formation ce mois-ci ou pas ?))",
    "Globalement, l'appli donne ce sentiment : c'est sérieux, c'est du business, ma belle — et c'est une bonne sensation, vraiment nécessaire pour un développement systématique.",
    "Je suis sûre que ce sera utile à beaucoup de professionnels.",
  ],
  pl: [
    "Naprawdę bierze na siebie część pracy, którą teraz robię ręcznie w notesiku, gdzie wszystko jest pokreślone)).",
    "Fajnie, że przypomnienia działają i dla psychologa, i dla klienta, choć jeszcze nie ogarnęłam, czy klient może widzieć wolne okienka do zapisu — to byłoby wygodne.",
    "Wykresy miesięczne i roczne dają ogólny obraz tego, dokąd zmierzam, jaka jest dynamika i co można planować na później.",
    "Ciekawa rzecz z prognozowaniem zysku, to coś nowego dla mnie — szczególnie spodobało mi się, że prognoza daje realistyczny obraz: czy mogę sobie pozwolić na szkolenie w tym miesiącu, czy nie?))",
    "Ogólnie wygląda, że programik daje uczucie: wszystko na poważnie, to biznes, kochana — i to dobre uczucie, naprawdę potrzebne do systemowego rozwoju.",
    "Jestem pewna, że przyda się wielu specjalistom.",
  ],
};

const SVITLANA_PARAGRAPHS: Record<Language, string[]> = {
  uk: [
    "мені подобається. Дуже корисна штука. Зразу видно на якому ти світі і що відбувається. Дякую що розширила мій всесвіт.",
  ],
  en: [
    "i like it. Very useful thing. You immediately see where you are and what's going on. Thank you for expanding my universe.",
  ],
  fr: [
    "ça me plaît. Vraiment utile. On voit tout de suite où on en est et ce qui se passe. Merci d'avoir élargi mon univers.",
  ],
  pl: [
    "podoba mi się. Bardzo przydatna rzecz. Od razu widać, na jakim świecie jesteś i co się dzieje. Dziękuję, że poszerzyłaś mój wszechświat.",
  ],
};

function TestimonialCard({
  name,
  role,
  paragraphs,
  expandable = false,
}: {
  name: string;
  role: string;
  paragraphs: string[];
  expandable?: boolean;
}) {
  const { t } = useLandingLang();
  const [expanded, setExpanded] = useState(false);
  const visible = expandable && !expanded ? paragraphs.slice(0, 1) : paragraphs;
  return (
    <figure className="p-6 sm:p-7 rounded-2xl bg-card border border-border flex flex-col shadow-sm">
      <Quote className="h-6 w-6 text-primary mb-3" />
      <blockquote className="text-base text-foreground leading-relaxed flex-1 space-y-3 whitespace-pre-line">
        {visible.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </blockquote>
      {expandable && paragraphs.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 self-start text-sm font-semibold text-primary hover:underline"
        >
          {expanded ? t("testReadLess") : t("testReadMore")}
        </button>
      )}
      <figcaption className="mt-5 pt-4 border-t border-border text-sm">
        <div className="font-semibold text-foreground">{name}</div>
        <div className="text-muted-foreground">{role}</div>
      </figcaption>
    </figure>
  );
}

// ⚠️ EDITABLE PLACEHOLDER CONTENT — replace with real metrics/quotes before launch.
const SOCIAL_PROOF_METRICS = [
  { value: "300+", label: "Therapists using SoloBizz" },
  { value: "~4 hrs", label: "Admin time saved per week on average" },
  { value: "5 min", label: "To set up your full practice profile" },
];

const PLACEHOLDER_TESTIMONIALS = [
  {
    quote:
      "I used to spend Sunday evenings catching up on invoices and checking who paid. Now I open SoloBizz on Monday morning and everything is already there. I didn't realise how much time I was losing until I stopped losing it.",
    name: "Olena L.",
    role: "Psychotherapist · Solo Practice",
  },
  {
    quote:
      "As a supervisor I work with many supervisees alongside my own clients. Keeping track of everything in Excel was a constant headache. SoloBizz gave me one place for all of it — sessions, payments, notes. It just works.",
    name: "Mariana K.",
    role: "Psychologist & supervisor · Pro Practice",
  },
  {
    quote:
      "I started on Free Starter just to try it. Within a week I knew I wanted to stay. The booking link alone saved me so many back-and-forth messages with clients.",
    name: "Dmytro P.",
    role: "Psychologist · started Free Starter",
  },
];

const HIGHLIGHT_QUOTE = {
  quote:
    "I was skeptical that a €12 tool could replace everything I had scattered across three apps. It did.",
  name: "Anna V.",
  role: "Psychotherapist, 3 months on Solo Practice",
};

function TestimonialsSection() {
  const { t, lang } = useLandingLang();
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary mb-4">
            From therapists who switched
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Trusted by private practitioners
          </h2>
          <p className="text-lg text-muted-foreground">
            Psychologists, psychotherapists and supervisors use SoloBizz to manage their practice with less admin chaos.
          </p>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {SOCIAL_PROOF_METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl bg-card border border-border p-6 text-center shadow-sm"
            >
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">{m.value}</div>
              <div className="text-sm text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Placeholder testimonials (spec) */}
        <div className="grid md:grid-cols-3 gap-5 items-start mb-10">
          {PLACEHOLDER_TESTIMONIALS.map((tt) => (
            <figure
              key={tt.name}
              className="p-6 rounded-2xl bg-card border border-border flex flex-col shadow-sm h-full"
            >
              <Quote className="h-6 w-6 text-primary mb-3" />
              <blockquote className="text-base text-foreground leading-relaxed flex-1">
                "{tt.quote}"
              </blockquote>
              <figcaption className="mt-5 pt-4 border-t border-border text-sm">
                <div className="font-semibold text-foreground">— {tt.name}</div>
                <div className="text-muted-foreground">{tt.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Highlight quote banner */}
        <div className="rounded-2xl bg-secondary border border-border p-6 sm:p-8 text-center mb-14">
          <Quote className="h-7 w-7 text-primary mx-auto mb-3" />
          <p className="text-lg sm:text-xl font-semibold text-secondary-foreground leading-relaxed max-w-3xl mx-auto">
            "{HIGHLIGHT_QUOTE.quote}"
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            — {HIGHLIGHT_QUOTE.name}, {HIGHLIGHT_QUOTE.role}
          </p>
        </div>

        {/* Real early-user testimonials */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t("testTitle")}</h3>
          <p className="text-base text-muted-foreground">{t("testSub")}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 items-start">
          <TestimonialCard
            name="Наталя"
            role={lang === "uk" ? "Психотерапевт" : lang === "fr" ? "Psychothérapeute" : lang === "pl" ? "Psychoterapeutka" : "Psychotherapist"}
            paragraphs={NATALIA_PARAGRAPHS[lang] ?? NATALIA_PARAGRAPHS.en}
            expandable
          />
          <TestimonialCard
            name="Світлана"
            role={lang === "uk" ? "Психолог" : lang === "fr" ? "Psychologue" : lang === "pl" ? "Psycholog" : "Psychologist"}
            paragraphs={SVITLANA_PARAGRAPHS[lang] ?? SVITLANA_PARAGRAPHS.en}
          />
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────

function FaqSection() {
  const { t } = useLandingLang();
  const items: { q: CopyKey; a: CopyKey }[] = [
    { q: "faq1Q", a: "faq1A" },
    { q: "faq2Q", a: "faq2A" },
    { q: "faq3Q", a: "faq3A" },
    { q: "faq4Q", a: "faq4A" },
    { q: "faq5Q", a: "faq5A" },
    { q: "faq6Q", a: "faq6A" },
    { q: "faq7Q", a: "faq7A" },
  ];
  return (
    <section id="faq" className="py-20 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-10">
          {t("faqTitle")}
        </h2>
        <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border px-2 sm:px-4">
          {items.map((it, idx) => (
            <AccordionItem key={it.q} value={`item-${idx}`} className="border-b last:border-b-0">
              <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-foreground py-5">
                {t(it.q)}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                {t(it.a)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────

function FinalCTA() {
  const { t, lang } = useLandingLang();
  return (
    <section className="py-24 px-4 sm:px-6 bg-secondary">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl font-bold text-secondary-foreground leading-[1.15] mb-5">
          {t("finalTitle1")}
          <br />
          <span className="text-primary">{t("finalTitle2")}</span>
        </h2>
        <p className="text-lg text-secondary-foreground/80 max-w-xl mx-auto mb-8">
          {t("finalDesc")}
        </p>
        <div className="flex items-center justify-center">
          <PrimaryCta label={t("finalCta")} source="/" cta="final" className="text-base px-8 h-12" />
        </div>

        <div id="contact" className="mt-14 max-w-2xl mx-auto rounded-2xl border border-sidebar-border bg-accent/30 p-6 sm:p-10 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-secondary-foreground mb-3">
            {lang === "uk" ? "Залишились сумніви?" : t("doubtTitle")}
          </h3>
          <p className="text-base text-secondary-foreground/80 mb-3">
            {lang === "uk"
              ? "Запишіться на коротку розмову, і ми покажемо, як SoloBizz може спростити вашу роботу, упорядкувати записи, оплати та допомогти краще бачити фінансову картину вашої практики."
              : t("doubtText")}
          </p>
          <p className="text-sm text-secondary-foreground/70 mb-6">
            {lang === "uk"
              ? "Після короткої розмови ви зрозумієте, як система може підійти саме під ваш формат роботи."
              : "After a short call you'll understand how the system can fit your way of working."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <BookingDialog
              lang={lang}
              source="/#final"
              trigger={
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => track("cta_clicked", { source_page: "/#final", cta: "book_call", lang })}
                >
                  <MessageCircle className="h-4 w-4" />
                  {lang === "uk" ? "Поспілкуватися" : t("doubtCta")}
                </Button>
              }
            />
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              onClick={() => track("cta_clicked", { source_page: "/#final", cta: "email_us", lang })}
            >
              <Button size="lg" variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                {lang === "uk" ? "Написати нам"
                  : lang === "fr" ? "Nous écrire"
                  : lang === "pl" ? "Napisz do nas"
                  : "Email us"}
              </Button>
            </a>
          </div>
          <p className="text-xs text-secondary-foreground/60 mt-5">
            {lang === "uk"
              ? "Можете залишити заявку або написати на email — ми відповімо зручним для вас способом."
              : lang === "fr"
              ? "Laissez une demande ou écrivez-nous par email — nous répondrons par le canal qui vous convient."
              : lang === "pl"
              ? "Zostaw zgłoszenie lub napisz e-mail — odpowiemy w wygodny dla Ciebie sposób."
              : "Leave a request or email us — we'll reply your way."}
          </p>
        </div>
      </div>
    </section>
  );
}

// ── About / Contacts / Footer ─────────────────────────────────────────

function AboutContactsSection() {
  const { lang } = useLandingLang();
  const isUk = lang === "uk";
  return (
    <section id="about" className="py-20 px-4 sm:px-6 bg-background">
      <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* About */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5">
            {isUk ? "Про нас" : "About us"}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-4">
            {isUk
              ? "SoloBizz — це система для психологів, психотерапевтів, супервізорів, викладачів і приватних спеціалістів, які хочуть вести клієнтів, записи, оплати та бачити фінансовий результат без хаосу, Excel і ручного обліку."
              : "SoloBizz is a system for psychologists, psychotherapists, supervisors, teachers and solo professionals who want to manage clients, sessions, payments and see real financial results — without chaos, Excel or manual tracking."}
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            {isUk
              ? "Ми створюємо інструмент, який допомагає перетворити приватну практику на більш системний, зрозумілий і керований бізнес."
              : "We're building a tool that turns a private practice into a more systematic, clear and manageable business."}
          </p>
        </div>

        {/* Contacts */}
        <div id="contacts">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5">
            {isUk ? "Контакти" : "Contacts"}
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                  {isUk ? "Локація" : "Location"}
                </div>
                <div className="text-foreground">{OFFICE_ADDRESS}</div>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Email</div>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground hover:text-primary">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                  {isUk ? "Телефон" : "Phone"}
                </div>
                <a href={`tel:${PHONE_NUMBER.replace(/\s+/g, "")}`} className="text-foreground hover:text-primary">
                  {PHONE_NUMBER}
                </a>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isUk ? "Консультації англійською та українською мовами" : "Consultations in English and Ukrainian"}
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  const { lang } = useLandingLang();
  const isUk = lang === "uk";
  const groups = [
    {
      title: isUk ? "Продукт" : "Product",
      links: [
        { label: isUk ? "Як це працює" : "How it works", href: "#comparison" },
        { label: isUk ? "Ціни" : "Pricing", href: "#pricing" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      title: isUk ? "Компанія" : "Company",
      links: [
        { label: isUk ? "Про нас" : "About us", href: "#about" },
        { label: isUk ? "Контакти" : "Contacts", href: "#contacts" },
        { label: isUk ? "Вакансії" : "Careers", href: VACANCIES_URL },
      ],
    },
    {
      title: isUk ? "Зв'язок" : "Get in touch",
      links: [
        { label: "Email", href: `mailto:${CONTACT_EMAIL}`, external: true },
        
        { label: isUk ? "Телефон" : "Phone", href: `tel:${PHONE_NUMBER.replace(/\s+/g, "")}`, external: true },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-secondary/30 px-4 sm:px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xl font-bold text-foreground mb-2">SoloBizz</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {isUk
                ? "CRM для приватної практики: клієнти, записи, оплати та фінанси."
                : "CRM for private practice: clients, bookings, payments and finance."}
            </p>
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              {OFFICE_ADDRESS}
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <h4 className="text-sm font-semibold text-foreground mb-3">{g.title}</h4>
              <ul className="space-y-2">
                {g.links.map((l) => {
                  const isTelegram = l.href === TELEGRAM_URL;
                  return (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target={l.external ? "_blank" : undefined}
                        rel={l.external ? "noopener noreferrer" : undefined}
                        onClick={isTelegram ? () => track("cta_clicked", { source_page: "/#footer", cta: "telegram", lang }) : undefined}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SoloBizz. {isUk ? "Усі права захищені." : "All rights reserved."}
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground">
              {isUk ? "Умови" : "Terms"}
            </Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground">
              {isUk ? "Конфіденційність" : "Privacy"}
            </Link>
            <Link to="/cookie-policy" className="text-xs text-muted-foreground hover:text-foreground">
              {isUk ? "Cookies" : "Cookies"}
            </Link>
            <button
              type="button"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent("cookie_consent_open")); } catch {}
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {isUk ? "Керувати cookies" : "Manage cookies"}
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}

// ── SEO (localized meta) ──────────────────────────────────────────────

const SEO_META: Record<Language, { title: string; description: string; ogTitle: string; ogDesc: string; ogLocale: string; htmlLang: string }> = {
  en: {
    title: "SoloBizz — CRM for psychologists, coaches & solo practices",
    description: "SoloBizz helps psychologists, therapists, coaches and tutors manage clients, sessions, payments and income — all in one calm, simple workspace.",
    ogTitle: "SoloBizz — Run your solo practice without the chaos",
    ogDesc: "Clients, sessions, payments and income in one place. Built for psychologists, therapists, coaches and tutors.",
    ogLocale: "en_US",
    htmlLang: "en",
  },
  uk: {
    title: "SoloBizz — CRM для психологів, коучів і приватної практики",
    description: "SoloBizz допомагає психологам, терапевтам, коучам і репетиторам вести клієнтів, сесії, оплати та дохід — в одному простому робочому просторі.",
    ogTitle: "SoloBizz — Керуйте приватною практикою без хаосу",
    ogDesc: "Клієнти, сесії, оплати та дохід в одному місці. Створено для психологів, терапевтів, коучів і репетиторів.",
    ogLocale: "uk_UA",
    htmlLang: "uk",
  },
  fr: {
    title: "SoloBizz — CRM pour psychologues, coachs et pratiques solo",
    description: "SoloBizz aide les psychologues, thérapeutes, coachs et tuteurs à gérer clients, séances, paiements et revenus — dans un espace simple et apaisé.",
    ogTitle: "SoloBizz — Gérez votre pratique solo sans le chaos",
    ogDesc: "Clients, séances, paiements et revenus en un seul endroit. Conçu pour psychologues, thérapeutes, coachs et tuteurs.",
    ogLocale: "fr_FR",
    htmlLang: "fr",
  },
  pl: {
    title: "SoloBizz — CRM dla psychologów, coachów i praktyki solo",
    description: "SoloBizz pomaga psychologom, terapeutom, coachom i korepetytorom zarządzać klientami, sesjami, płatnościami i dochodem — w jednym prostym miejscu.",
    ogTitle: "SoloBizz — Prowadź praktykę solo bez chaosu",
    ogDesc: "Klienci, sesje, płatności i dochód w jednym miejscu. Stworzone dla psychologów, terapeutów, coachów i korepetytorów.",
    ogLocale: "pl_PL",
    htmlLang: "pl",
  },
};

function setMeta(selector: string, attr: "content", value: string) {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute(attr, value);
}

export function LandingSEO() {
  const { lang } = useLandingLang();
  useEffect(() => {
    const m = SEO_META[lang] ?? SEO_META.en;
    document.title = m.title;
    document.documentElement.lang = m.htmlLang;
    setMeta('meta[name="description"]', "content", m.description);
    setMeta('meta[property="og:title"]', "content", m.ogTitle);
    setMeta('meta[property="og:description"]', "content", m.ogDesc);
    setMeta('meta[property="og:locale"]', "content", m.ogLocale);
    setMeta('meta[name="twitter:title"]', "content", m.ogTitle);
    setMeta('meta[name="twitter:description"]', "content", m.ogDesc);
  }, [lang]);
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  useEffect(() => {
    track("landing_view");
  }, []);

  return (
    <LandingLangProvider>
      <LandingSEO />
      <Helmet>
        <link rel="canonical" href="https://solo-bizz.com/" />
        <meta property="og:url" content="https://solo-bizz.com/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Is it hard to start using SoloBizz?", acceptedAnswer: { "@type": "Answer", text: "No. You can sign up and add your first client in under a minute. No setup, no training required." } },
            { "@type": "Question", name: "Will it work if I work alone?", acceptedAnswer: { "@type": "Answer", text: "Yes. SoloBizz is built specifically for solo practitioners — psychologists, therapists, coaches and tutors." } },
            { "@type": "Question", name: "Can I run group sessions or supervisions?", acceptedAnswer: { "@type": "Answer", text: "Yes. You can manage individual sessions, group sessions and supervisions in one place." } },
            { "@type": "Question", name: "Can I use it for teaching or tutoring?", acceptedAnswer: { "@type": "Answer", text: "Yes. Tutors and teachers use SoloBizz to track lessons, payments and student progress." } },
            { "@type": "Question", name: "Is there free access?", acceptedAnswer: { "@type": "Answer", text: "Yes. SoloBizz has a permanent Free Starter plan for up to 5 active clients — no credit card required." } },
            { "@type": "Question", name: "Do I need a credit card to start?", acceptedAnswer: { "@type": "Answer", text: "No credit card is needed for the Free Starter plan." } },
          ],
        })}</script>
      </Helmet>
      <div className="min-h-screen bg-background">
        <LandingNav />
        <main>
          <HeroSection />
          <StatsSection />
          <PainSection />
          <WhatChangesSection />
          <FeaturesSection />
          <TestimonialsSection />
          <PricingSection />

          <FaqSection />
          <FinalCTA />
          <AboutContactsSection />
        </main>
        <LandingFooter />
      </div>
    </LandingLangProvider>
  );
}

