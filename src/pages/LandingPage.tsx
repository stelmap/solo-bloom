import { useState, useCallback, createContext, useContext, useEffect } from "react";
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
  ArrowRight, CheckCircle2, AlertTriangle, Eye, TrendingUp,
  Calendar as CalendarIcon, Users, Sparkles, ShieldCheck,
  Play, X, Check, Briefcase, GraduationCap, UserCheck, BookOpen,
  Quote, MessageCircle, Mail, Phone, MapPin, Send,
} from "lucide-react";
import manualTrackingImg from "@/assets/manual-tracking-spreadsheet.png";
import soloBizzPreviewImg from "@/assets/solobizz-client-profile.png";

// ── Configurable external links (replace as needed) ───────────────────
const YOUTUBE_URL = "https://www.youtube.com/@OneBizz_SoloBizz";
const CONTACT_EMAIL = "info@solo-bizz.com";
const CONTACT_OR_CALENDAR_URL = `mailto:${CONTACT_EMAIL}`;
const BOOKING_URL = "#booking"; // [BOOKING_OR_CONTACT_FORM_URL]
const TELEGRAM_URL = "https://t.me/solobizzcontact";
const TELEGRAM_HANDLE = "@solobizzcontact";
const PHONE_NUMBER = "+48 000 000 000"; // [PHONE_NUMBER]
const OFFICE_ADDRESS = "Poland, Wroclaw, Gwiadzista 16";
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
  heroBadge: { en: "For psychologists & solo professionals", fr: "Pour psychologues & indépendants", uk: "Для психологів, супервізорів та викладачів", pl: "Dla psychologów i solowych profesjonalistów" },
  heroTitle: {
    en: "Control your clients and income — without Excel and chaos",
    fr: "Maîtrisez vos clients et vos revenus — sans Excel ni chaos",
    uk: "Контроль клієнтів і доходу без Excel і хаосу",
    pl: "Kontroluj klientów i dochód — bez Excela i chaosu",
  },
  heroSub: {
    en: "A CRM for psychologists, psychotherapists, supervisors and teachers that automatically tracks sessions, payments, income and profit.",
    fr: "Un CRM pour psychologues, psychothérapeutes, superviseurs et enseignants qui suit automatiquement les séances, paiements, revenus et bénéfices.",
    uk: "CRM для психологів, психотерапевтів, супервізорів і викладачів, яка автоматично рахує записи, оплати, дохід і прибуток.",
    pl: "CRM dla psychologów, psychoterapeutów, superwizorów i nauczycieli, który automatycznie liczy sesje, płatności, dochód i zysk.",
  },
  heroCta: { en: "Start for free", fr: "Commencer gratuitement", uk: "Почати безкоштовно", pl: "Zacznij za darmo" },
  heroSecondary: { en: "See pricing", fr: "Voir les tarifs", uk: "Переглянути ціни", pl: "Zobacz cennik" },
  heroSubCta: {
    en: "Free Starter: no payment while you have up to 5 active clients.",
    fr: "Free Starter : sans paiement tant que vous avez jusqu'à 5 clients actifs.",
    uk: "Free Starter: без оплати, поки у вас до 5 активних клієнтів.",
    pl: "Free Starter: bez opłat, dopóki masz do 5 aktywnych klientów.",
  },
  trustData: { en: "Client data is protected", fr: "Données clients protégées", uk: "Дані клієнтів захищені", pl: "Dane klientów chronione" },
  trustStripe: { en: "Secure Stripe payments", fr: "Paiements sécurisés via Stripe", uk: "Безпечна оплата через Stripe", pl: "Bezpieczne płatności przez Stripe" },
  trustGdpr: { en: "GDPR-friendly", fr: "Compatible RGPD", uk: "GDPR-friendly підхід", pl: "Zgodne z RODO" },
  trustSupport: { en: "Email & Telegram support", fr: "Support email & Telegram", uk: "Підтримка через email та Telegram", pl: "Wsparcie przez email i Telegram" },

  // Dashboard preview
  dpClients: { en: "Active clients", fr: "Clients actifs", uk: "Активні клієнти", pl: "Aktywni klienci" },
  dpSessions: { en: "Sessions this week", fr: "Séances cette semaine", uk: "Сесій цього тижня", pl: "Sesje w tym tygodniu" },
  dpIncome: { en: "Income this month", fr: "Revenus ce mois", uk: "Дохід цього місяця", pl: "Przychód w tym miesiącu" },
  dpUpcoming: { en: "Upcoming sessions", fr: "Séances à venir", uk: "Найближчі сесії", pl: "Nadchodzące sesje" },
  dpPaid: { en: "Paid", fr: "Payé", uk: "Оплачено", pl: "Opłacone" },
  dpPending: { en: "Pending", fr: "En attente", uk: "Очікує", pl: "Oczekujące" },

  // Pain
  painTitle: { en: "This is probably happening to you:", fr: "Voilà ce qui vous arrive sûrement :", uk: "Ймовірно, це відбувається з вами:", pl: "Prawdopodobnie dotyczy Cię to:" },
  pain1: {
    en: "You don't know your real monthly income",
    fr: "Vous ignorez vos vrais revenus mensuels",
    uk: "Ви не знаєте реального місячного доходу",
    pl: "Nie znasz swoich rzeczywistych miesięcznych dochodów",
  },
  pain2: {
    en: "Records live in different places: calendar, messengers, Excel, notes",
    fr: "Vos données sont éparpillées : calendrier, messageries, Excel, notes",
    uk: "Записи ведуться в різних місцях: календар, месенджери, Excel, нотатки",
    pl: "Zapisy są w różnych miejscach: kalendarz, komunikatory, Excel, notatki",
  },
  pain3: {
    en: "Payments, debts and prepayments have to be remembered manually",
    fr: "Paiements, dettes et avances : tout est mémorisé à la main",
    uk: "Оплати, борги та передоплати доводиться згадувати вручну",
    pl: "Płatności, długi i zaliczki trzeba pamiętać ręcznie",
  },
  pain4: {
    en: "You feel busy, but you can't see how profitable your practice really is",
    fr: "Vous êtes occupé sans voir si votre activité est vraiment rentable",
    uk: "Ви зайняті, але не бачите, наскільки прибуткова ваша практика",
    pl: "Jesteś zajęty, ale nie widzisz, jak rentowna jest Twoja praktyka",
  },
  pain5: {
    en: "Routine eats time you could spend on clients, learning and growth",
    fr: "La routine vous prend du temps utile à vos clients et à votre développement",
    uk: "Багато часу йде на рутину, замість клієнтів, навчання і розвитку",
    pl: "Rutyna zjada czas, który mógłbyś poświęcić klientom i rozwojowi",
  },
  painBottom: {
    en: "This is not a productivity issue. This is lack of system.",
    fr: "Ce n'est pas un problème de productivité. C'est un manque de système.",
    uk: "Це не проблема продуктивності. Це відсутність системи.",
    pl: "To nie problem produktywności. To brak systemu.",
  },
  painCta: { en: "Fix this in 5 minutes", fr: "Réglez ça en 5 minutes", uk: "Виправити за 5 хвилин", pl: "Napraw to w 5 minut" },

  // Audience
  audTitle: { en: "Who Solo Bizz is for", fr: "À qui s'adresse Solo Bizz", uk: "Кому підходить Solo Bizz", pl: "Dla kogo jest Solo Bizz" },
  audSub: {
    en: "One tool for specialists who work with people, schedules, payments and results.",
    fr: "Un outil pour les pros qui travaillent avec des personnes, des plannings, des paiements et des résultats.",
    uk: "Один інструмент для спеціалістів, які працюють з людьми, розкладом, оплатами та результатами.",
    pl: "Jedno narzędzie dla specjalistów pracujących z ludźmi, harmonogramem, płatnościami i wynikami.",
  },

  aud1Title: { en: "Private practitioners", fr: "Praticiens en libéral", uk: "Приватним практикам", pl: "Prywatni praktycy" },
  aud1Desc: {
    en: "For psychologists, psychotherapists and other specialists who want to see clients, sessions, payments, income, expenses and profit in one place.",
    fr: "Pour les psychologues, psychothérapeutes et autres pros qui veulent voir clients, séances, paiements, revenus, dépenses et bénéfice au même endroit.",
    uk: "Для психологів, психотерапевтів та інших спеціалістів, які хочуть бачити клієнтів, сесії, оплати, дохід, витрати й прибуток в одному місці.",
    pl: "Dla psychologów, psychoterapeutów i innych specjalistów, którzy chcą widzieć klientów, sesje, płatności, dochód, wydatki i zysk w jednym miejscu.",
  },
  aud1B1: { en: "Individual and group sessions", fr: "Séances individuelles et de groupe", uk: "Індивідуальні та групові сесії", pl: "Sesje indywidualne i grupowe" },
  aud1B2: { en: "Payments and debts under control", fr: "Paiements et dettes sous contrôle", uk: "Контроль оплат і боргів", pl: "Kontrola płatności i długów" },
  aud1B3: { en: "Income and expense tracking", fr: "Suivi des revenus et des dépenses", uk: "Облік доходів і витрат", pl: "Ewidencja przychodów i wydatków" },
  aud1B4: { en: "Financial result forecast", fr: "Prévision du résultat financier", uk: "Прогноз фінансового результату", pl: "Prognoza wyniku finansowego" },
  aud1B5: { en: "Decisions based on data, not feelings", fr: "Des décisions basées sur les données", uk: "Рішення на основі даних, а не відчуттів", pl: "Decyzje oparte na danych, nie na intuicji" },

  aud2Title: { en: "Supervisors", fr: "Superviseurs", uk: "Супервізорам", pl: "Superwizorzy" },
  aud2Desc: {
    en: "For supervisors running individual or group supervisions who want to control bookings, attendance, payments and history.",
    fr: "Pour les superviseurs qui gèrent supervisions individuelles ou de groupe et veulent suivre rendez-vous, présence, paiements et historique.",
    uk: "Для супервізорів, які проводять індивідуальні або групові супервізії та хочуть контролювати записи, присутність, оплати й історію роботи.",
    pl: "Dla superwizorów prowadzących superwizje indywidualne lub grupowe, którzy chcą kontrolować zapisy, obecność, płatności i historię.",
  },
  aud2B1: { en: "Supervision tracking", fr: "Suivi des supervisions", uk: "Облік супервізій", pl: "Ewidencja superwizji" },
  aud2B2: { en: "Attendance control", fr: "Contrôle des présences", uk: "Контроль присутності учасників", pl: "Kontrola obecności uczestników" },
  aud2B3: { en: "Payment analytics", fr: "Analytique des paiements", uk: "Аналітика оплат", pl: "Analityka płatności" },
  aud2B4: { en: "History of past meetings", fr: "Historique des séances passées", uk: "Історія проведених зустрічей", pl: "Historia odbytych spotkań" },
  aud2B5: { en: "Less manual calculation", fr: "Moins de calculs manuels", uk: "Менше ручної роботи з підрахунками", pl: "Mniej ręcznych obliczeń" },

  aud3Title: { en: "Early-career therapists", fr: "Thérapeutes en début de carrière", uk: "Початкуючим психотерапевтам", pl: "Początkujący psychoterapeuci" },
  aud3Desc: {
    en: "For specialists who are just building a practice and want to see their progress, session count, client base and financial dynamics.",
    fr: "Pour ceux qui démarrent leur pratique et veulent voir leur progression, séances, clientèle et dynamique financière.",
    uk: "Для спеціалістів, які тільки будують практику і хочуть бачити свій прогрес, кількість сесій, клієнтську базу та фінансову динаміку.",
    pl: "Dla specjalistów, którzy dopiero budują praktykę i chcą widzieć postęp, liczbę sesji, bazę klientów i dynamikę finansową.",
  },
  aud3B1: { en: "Number of sessions delivered", fr: "Nombre de séances réalisées", uk: "Кількість проведених сесій", pl: "Liczba przeprowadzonych sesji" },
  aud3B2: { en: "Practice progress", fr: "Progression de la pratique", uk: "Прогрес практики", pl: "Postęp praktyki" },
  aud3B3: { en: "Client notes", fr: "Notes clients", uk: "Нотатки по клієнтах", pl: "Notatki o klientach" },
  aud3B4: { en: "Clear interaction history", fr: "Historique d'interaction clair", uk: "Зрозуміла історія взаємодії", pl: "Czytelna historia interakcji" },
  aud3B5: { en: "Visible growth from your first clients", fr: "Une croissance visible dès les premiers clients", uk: "Видимість росту з перших клієнтів", pl: "Widoczny wzrost od pierwszych klientów" },

  aud4Title: { en: "Teachers and tutors", fr: "Enseignants et tuteurs", uk: "Вчителям і репетиторам", pl: "Nauczyciele i korepetytorzy" },
  aud4Desc: {
    en: "For teachers and tutors who work with students, lessons and payments and want to see learning progress without spreadsheet chaos.",
    fr: "Pour les enseignants et tuteurs qui suivent élèves, cours et paiements sans chaos de tableurs.",
    uk: "Для викладачів і репетиторів, які працюють з учнями, заняттями, оплатами та хочуть бачити прогрес навчання без хаосу в таблицях.",
    pl: "Dla nauczycieli i korepetytorów, którzy pracują z uczniami, zajęciami i płatnościami i chcą widzieć postępy bez chaosu arkuszy.",
  },
  aud4B1: { en: "Lesson schedule", fr: "Planning des cours", uk: "Розклад занять", pl: "Harmonogram zajęć" },
  aud4B2: { en: "Student notes", fr: "Notes élèves", uk: "Нотатки по учнях", pl: "Notatki o uczniach" },
  aud4B3: { en: "Payment control", fr: "Contrôle des paiements", uk: "Контроль оплат", pl: "Kontrola płatności" },
  aud4B4: { en: "Learning progress", fr: "Progression d'apprentissage", uk: "Прогрес навчання", pl: "Postępy nauki" },
  aud4B5: { en: "Convenient organization of work", fr: "Organisation simple de votre travail", uk: "Зручна організація роботи", pl: "Wygodna organizacja pracy" },

  audValueTitle: { en: "What you get", fr: "Ce que vous y gagnez", uk: "Що це дає?", pl: "Co dzięki temu zyskujesz?" },
  audValueText: {
    en: "Solo Bizz helps you see finances, profit, payments, practice load and work results. You make decisions based on data, not feelings. Less routine — more time for clients, learning and growth.",
    fr: "Solo Bizz vous montre finances, bénéfice, paiements, charge de travail et résultats. Vous décidez sur la base de données, pas d'impressions. Moins de routine, plus de temps pour vos clients et votre développement.",
    uk: "Solo Bizz допомагає бачити фінанси, прибуток, оплати, завантаження практики та результативність роботи. Ви приймаєте рішення на основі даних, а не відчуттів. Менше рутинної роботи — більше часу на клієнтів, навчання і розвиток.",
    pl: "Solo Bizz pomaga widzieć finanse, zysk, płatności, obciążenie praktyki i wyniki pracy. Podejmujesz decyzje na podstawie danych, a nie odczuć. Mniej rutyny — więcej czasu na klientów, naukę i rozwój.",
  },

  // Preview
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
    en: "Excel, notebooks and chaos — or Solo Bizz",
    fr: "Excel, carnets et chaos — ou Solo Bizz",
    uk: "Excel, блокноти й хаос — або Solo Bizz",
    pl: "Excel, notesy i chaos — albo Solo Bizz",
  },
  cmpSub: {
    en: "Compare manual tracking with a system that automatically shows you bookings, payments, debts, income and profit.",
    fr: "Comparez le suivi manuel à un système qui affiche automatiquement rendez-vous, paiements, dettes, revenus et bénéfice.",
    uk: "Порівняйте ручний облік із системою, яка автоматично показує вам записи, оплати, борги, дохід і прибуток.",
    pl: "Porównaj ręczną ewidencję z systemem, który automatycznie pokazuje rezerwacje, płatności, długi, dochód i zysk.",
  },
  cmpManual: { en: "Manual tracking", fr: "Suivi manuel", uk: "Ручний облік", pl: "Ręczna ewidencja" },
  cmpSolo: { en: "Solo Bizz", fr: "Solo Bizz", uk: "Solo Bizz", pl: "Solo Bizz" },
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
  pricingTitle: { en: "Choose your plan", fr: "Choisissez votre formule", uk: "Оберіть свій план", pl: "Wybierz swój plan" },
  pricingSub: {
    en: "Start free with up to 5 active clients. Upgrade anytime — only the active client limit changes.",
    fr: "Commencez gratuitement jusqu'à 5 clients actifs. Évoluez à tout moment — seule la limite de clients actifs change.",
    uk: "Почніть безкоштовно з до 5 активних клієнтів. Перейдіть на платний план будь-коли — змінюється лише ліміт активних клієнтів.",
    pl: "Zacznij za darmo z maks. 5 aktywnymi klientami. Zmieniaj plan w dowolnej chwili — różni się tylko limit aktywnych klientów.",
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
  freeF1: { en: "Up to 5 active clients", fr: "Jusqu'à 5 clients actifs", uk: "До 5 активних клієнтів", pl: "Do 5 aktywnych klientów" },
  freeF2: { en: "No time limit", fr: "Sans limite de temps", uk: "Без обмеження по часу", pl: "Bez limitu czasu" },
  freeF3: { en: "This is not a trial", fr: "Ce n'est pas une période d'essai", uk: "Це не пробний період", pl: "To nie jest okres próbny" },
  freeF4: { en: "Clients, sessions and payments in one place", fr: "Clients, séances et paiements au même endroit", uk: "Клієнти, сесії та оплати в одному місці", pl: "Klienci, sesje i płatności w jednym miejscu" },
  freeF5: { en: "Basic financial overview", fr: "Aperçu financier de base", uk: "Базовий фінансовий огляд", pl: "Podstawowy przegląd finansów" },
  freeCta: { en: "Start for free", fr: "Commencer gratuitement", uk: "Почати безкоштовно", pl: "Zacznij za darmo" },
  freeMicro: {
    en: "No payment while you have up to 5 active clients.",
    fr: "Sans paiement tant que vous avez jusqu'à 5 clients actifs.",
    uk: "Без оплати, поки у вас до 5 активних клієнтів.",
    pl: "Bez opłat, dopóki masz do 5 aktywnych klientów.",
  },

  soloName: { en: "Solo Practice", fr: "Solo Practice", uk: "Solo Practice", pl: "Solo Practice" },
  soloDesc: {
    en: "For a regular private practice.",
    fr: "Pour une pratique privée régulière.",
    uk: "Для регулярної приватної практики.",
    pl: "Dla regularnej prywatnej praktyki.",
  },
  soloF1: { en: "Up to 20 active clients", fr: "Jusqu'à 20 clients actifs", uk: "До 20 активних клієнтів", pl: "Do 20 aktywnych klientów" },
  soloF2: { en: "Full access to SoloBizz", fr: "Accès complet à SoloBizz", uk: "Повний доступ до SoloBizz", pl: "Pełny dostęp do SoloBizz" },
  soloF3: { en: "Calendar, sessions, clients, payments and finance", fr: "Calendrier, séances, clients, paiements et finances", uk: "Календар, сесії, клієнти, оплати та фінанси", pl: "Kalendarz, sesje, klienci, płatności i finanse" },
  soloF4: { en: "Email / Telegram reminders", fr: "Rappels Email / Telegram", uk: "Email / Telegram нагадування", pl: "Przypomnienia Email / Telegram" },
  soloF5: { en: "Great for a steadily growing practice", fr: "Idéal pour une pratique en croissance régulière", uk: "Підходить для практики, що стабільно росте", pl: "Idealne dla stale rosnącej praktyki" },
  soloCta: { en: "Choose Solo Practice", fr: "Choisir Solo Practice", uk: "Обрати Solo Practice", pl: "Wybierz Solo Practice" },
  soloBadge: {
    en: "Best for private practice",
    fr: "Idéal pour la pratique privée",
    uk: "Найкраще для приватної практики",
    pl: "Najlepsze dla prywatnej praktyki",
  },

  proName: { en: "Pro Practice", fr: "Pro Practice", uk: "Pro Practice", pl: "Pro Practice" },
  proDesc: {
    en: "For practices that scale.",
    fr: "Pour les pratiques qui se développent.",
    uk: "Для практики, що масштабується.",
    pl: "Dla praktyk, które się skalują.",
  },
  proF1: { en: "Unlimited active clients", fr: "Clients actifs illimités", uk: "Необмежена кількість активних клієнтів", pl: "Nielimitowana liczba aktywnych klientów" },
  proF2: { en: "Full access to SoloBizz", fr: "Accès complet à SoloBizz", uk: "Повний доступ до SoloBizz", pl: "Pełny dostęp do SoloBizz" },
  proF3: { en: "For 20+ active clients", fr: "Pour 20+ clients actifs", uk: "Для 20+ активних клієнтів", pl: "Dla 20+ aktywnych klientów" },
  proF4: { en: "Great for a large or active practice", fr: "Idéal pour une pratique large ou active", uk: "Підходить для великої або активної практики", pl: "Idealne dla dużej lub aktywnej praktyki" },
  proF5: { en: "No client cap", fr: "Pas de plafond de clients", uk: "Без обмеження по кількості клієнтів", pl: "Bez limitu klientów" },
  proCta: { en: "Choose Pro Practice", fr: "Choisir Pro Practice", uk: "Обрати Pro Practice", pl: "Wybierz Pro Practice" },
  proBadge: {
    en: "For a scaling practice",
    fr: "Pour une pratique en croissance",
    uk: "Для практики, що масштабується",
    pl: "Dla skalującej się praktyki",
  },

  // Testimonials
  testTitle: {
    en: "Psychologists are already testing Solo Bizz in their practice",
    fr: "Des psychologues testent déjà Solo Bizz dans leur cabinet",
    uk: "Психологи вже тестують Solo Bizz у своїй практиці",
    pl: "Psycholodzy już testują Solo Bizz w swojej praktyce",
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
  faq1Q: { en: "Is it hard to start using Solo Bizz?", fr: "Est-ce compliqué de démarrer avec Solo Bizz ?", uk: "Чи складно почати користуватись Solo Bizz?", pl: "Czy trudno zacząć korzystać z Solo Bizz?" },
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
    en: "Yes. The Free Starter plan is permanently free for up to 5 active clients. It is not a trial — there is no time limit.",
    fr: "Oui. Le plan Free Starter est gratuit en permanence jusqu'à 5 clients actifs. Ce n'est pas une période d'essai — pas de limite de temps.",
    uk: "Так. План Free Starter безкоштовний назавжди для до 5 активних клієнтів. Це не пробний період — немає обмеження по часу.",
    pl: "Tak. Plan Free Starter jest na stałe darmowy dla maks. 5 aktywnych klientów. To nie jest okres próbny — bez limitu czasu.",
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
    en: "Solo Bizz helps you see clients, bookings, payments, income and profit in one clear system.",
    fr: "Solo Bizz vous montre clients, RDV, paiements, revenus et bénéfice dans un système clair.",
    uk: "Solo Bizz допомагає бачити клієнтів, записи, оплати, дохід і прибуток в одній зрозумілій системі.",
    pl: "Solo Bizz pomaga widzieć klientów, zapisy, płatności, dochód i zysk w jednym czytelnym systemie.",
  },
  finalCta: { en: "Try it now", fr: "Essayer maintenant", uk: "Спробувати зараз", pl: "Wypróbuj teraz" },
  doubtTitle: { en: "Still in doubt?", fr: "Encore des doutes ?", uk: "Залишились сумніви?", pl: "Masz wątpliwości?" },
  doubtText: {
    en: "Book a short call and we'll show how Solo Bizz can simplify your work and reveal where profit gets lost.",
    fr: "Réservez un court échange : nous vous montrerons comment Solo Bizz simplifie votre travail et révèle les pertes de bénéfice.",
    uk: "Запишіться на коротку розмову, і ми покажемо, як Solo Bizz може спростити вашу роботу та показати, де губиться прибуток.",
    pl: "Zarezerwuj krótką rozmowę — pokażemy, jak Solo Bizz uprości pracę i odsłoni, gdzie znika zysk.",
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
      to={`/auth?plan=solo_${billing_cycle}`}
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

function VideoCta({ label, source, className = "" }: { label: string; source: string; className?: string }) {
  const { lang } = useLandingLang();
  return (
    <a
      href={YOUTUBE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("cta_clicked", { source_page: source, cta: "watch_video", lang })}
    >
      <Button size="lg" variant="outline" className={`gap-2 ${className}`}>
        <Play className="h-4 w-4" /> {label}
      </Button>
    </a>
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

// ── Dashboard preview (visual-only mock) ──────────────────────────────

function DashboardPreview() {
  const { t } = useLandingLang();
  return (
    <div className="relative mx-auto max-w-4xl">
      <div aria-hidden className="absolute -inset-4 sm:-inset-8 bg-primary/20 blur-3xl rounded-full opacity-40" />
      <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
          <span className="ml-3 text-xs text-muted-foreground">solo-bizz.com / dashboard</span>
        </div>

        <div className="p-5 sm:p-7 grid sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t("dpClients")}</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">24</div>
            <div className="text-xs text-primary mt-1">+3 this month</div>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t("dpSessions")}</span>
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">18</div>
            <div className="text-xs text-muted-foreground mt-1">6 today</div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t("dpIncome")}</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">€4,820</div>
            <div className="text-xs text-primary mt-1">+12% vs last</div>
          </div>
        </div>

        <div className="px-5 sm:px-7 pb-6">
          <div className="text-xs font-medium text-muted-foreground mb-3">{t("dpUpcoming")}</div>
          <div className="space-y-2">
            {[
              { name: "Anna L.", time: "10:00", price: "€80", paid: true },
              { name: "Marc D.", time: "11:30", price: "€80", paid: true },
              { name: "Sofia P.", time: "14:00", price: "€80", paid: false },
            ].map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                    {row.name[0]}
                  </div>
                  <span className="text-sm font-medium text-foreground">{row.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{row.time}</span>
                  <span className="text-sm font-semibold text-foreground">{row.price}</span>
                  <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${
                    row.paid ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {row.paid ? t("dpPaid") : t("dpPending")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

function HeroSection() {
  const { t } = useLandingLang();
  return (
    <section className="pt-28 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          {t("heroBadge")}
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-5">
          {t("heroTitle")}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          {t("heroSub")}
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <PrimaryCta label={t("heroCta")} source="/" cta="hero" className="text-base px-8 h-12" />
            <a
              href="#pricing"
              className="inline-flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 h-12"
            >
              {t("heroSecondary")}
            </a>
          </div>
          <p className="text-sm text-muted-foreground">{t("heroSubCta")}</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground mt-2">
            <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> {t("trustData")}</li>
            <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t("trustStripe")}</li>
            <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t("trustGdpr")}</li>
            <li className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-primary" /> {t("trustSupport")}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Pain ──────────────────────────────────────────────────────────────

function PainSection() {
  const { t } = useLandingLang();
  const items: CopyKey[] = ["pain1", "pain2", "pain3", "pain4", "pain5"];
  return (
    <section className="py-20 px-4 sm:px-6 bg-secondary">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground text-center mb-10">
          {t("painTitle")}
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

// ── Audience ──────────────────────────────────────────────────────────

type AudienceCard = {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: CopyKey;
  descKey: CopyKey;
  bullets: CopyKey[];
};

function AudienceSection() {
  const { t } = useLandingLang();
  const cards: AudienceCard[] = [
    { icon: Briefcase, titleKey: "aud1Title", descKey: "aud1Desc", bullets: ["aud1B1", "aud1B2", "aud1B3", "aud1B4", "aud1B5"] },
    { icon: UserCheck, titleKey: "aud2Title", descKey: "aud2Desc", bullets: ["aud2B1", "aud2B2", "aud2B3", "aud2B4", "aud2B5"] },
    { icon: GraduationCap, titleKey: "aud3Title", descKey: "aud3Desc", bullets: ["aud3B1", "aud3B2", "aud3B3", "aud3B4", "aud3B5"] },
    { icon: BookOpen, titleKey: "aud4Title", descKey: "aud4Desc", bullets: ["aud4B1", "aud4B2", "aud4B3", "aud4B4", "aud4B5"] },
  ];
  return (
    <section id="audience" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("audTitle")}</h2>
          <p className="text-lg text-muted-foreground">{t("audSub")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.titleKey} className="flex flex-col p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t(c.titleKey)}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t(c.descKey)}</p>
                <ul className="space-y-2 mt-auto">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{t(b)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 max-w-3xl mx-auto rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-3">{t("audValueTitle")}</h3>
          <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">{t("audValueText")}</p>
        </div>
      </div>
    </section>
  );
}

// ── Demo / Wow ────────────────────────────────────────────────────────

function DemoSection() {
  const { t } = useLandingLang();
  return (
    <section className="py-20 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-4">
          <Eye className="h-3.5 w-3.5" /> Live preview
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          {t("demoTitle")}
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          {t("demoText")}
        </p>
        <DashboardPreview />
        <div className="mt-10 flex justify-center">
          <PrimaryCta label={t("heroCta")} source="/#preview" cta="preview" className="text-base px-8 h-12" />
        </div>
      </div>
    </section>
  );
}

// ── Comparison ────────────────────────────────────────────────────────

function ComparisonSection() {
  const { t } = useLandingLang();
  const manual: CopyKey[] = ["cmpM1", "cmpM2", "cmpM3", "cmpM4", "cmpM5", "cmpM6"];
  const solo: CopyKey[] = ["cmpS1", "cmpS2", "cmpS3", "cmpS4", "cmpS5", "cmpS6"];
  return (
    <section id="comparison" className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("cmpTitle")}</h2>
          <p className="text-lg text-muted-foreground">{t("cmpSub")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Manual tracking card */}
          <div className="relative flex flex-col p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl sm:text-2xl font-semibold text-muted-foreground">
                {t("cmpManual")}
              </h3>
              <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-destructive/10 text-destructive">
                {t("cmpManualBadge")}
              </span>
            </div>
            <div className="mb-6 rounded-xl overflow-hidden border border-border bg-muted/40 aspect-[16/9]">
              <img
                src={manualTrackingImg}
                alt="Spreadsheet with manual client and payment tracking"
                loading="lazy"
                className="w-full h-full object-cover object-top grayscale-[35%] opacity-90"
              />
            </div>
            <ul className="space-y-3.5 flex-1">
              {manual.map((k) => (
                <li key={k} className="flex items-start gap-3 text-foreground/80">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                    <X className="h-4 w-4 text-destructive" />
                  </span>
                  <span className="text-base leading-relaxed">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solo Bizz card */}
          <div className="relative flex flex-col p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-primary/[0.06] via-card to-primary/[0.04] border-2 border-primary/40 shadow-lg shadow-primary/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("cmpSolo")}
              </h3>
              <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/15 text-primary">
                {t("cmpSoloBadge")}
              </span>
            </div>
            <div className="mb-6 rounded-xl overflow-hidden border border-primary/20 bg-background shadow-sm aspect-[16/9]">
              <img
                src={soloBizzPreviewImg}
                alt="Solo Bizz client profile dashboard"
                loading="lazy"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <ul className="space-y-3.5 flex-1">
              {solo.map((k) => (
                <li key={k} className="flex items-start gap-3 text-foreground">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </span>
                  <span className="text-base leading-relaxed font-medium">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <PrimaryCta label={t("cmpCta")} source="/#comparison" cta="comparison" className="text-base px-8 h-12" />
          <p className="text-sm text-muted-foreground">{t("cmpCtaNote")}</p>
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
      bullets: [t("soloF1"), t("soloF2"), t("soloF3"), t("soloF4"), t("soloF5")],
      cta: t("soloCta"),
      badge: t("soloBadge"),
      highlighted: true,
      monthly: 19,
      quarterly: 45.6,
      yearly: 136.8,
    },
    {
      id: "pro",
      name: t("proName"),
      desc: t("proDesc"),
      bullets: [t("proF1"), t("proF2"), t("proF3"), t("proF4"), t("proF5")],
      cta: t("proCta"),
      badge: t("proBadge"),
      monthly: 49,
      quarterly: 117.6,
      yearly: 352.8,
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
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("pricingTitle")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("pricingSub")}</p>
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

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {/* Free Starter card */}
          <div className="relative p-7 rounded-2xl bg-card border-2 border-border flex flex-col">
            <h3 className="text-xl font-semibold text-foreground">{t("freeName")}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">{t("freeDesc")}</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-foreground">€0</span>
              <span className="text-muted-foreground text-base">{t("perMonth")}</span>
            </div>
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
              to="/auth?plan=free_starter"
              onClick={() =>
                track("cta_clicked", { source_page: `/#pricing-${cycle}-free`, cta: "pricing_plan", plan_type: "free_starter", billing_cycle: cycle })
              }
              className="block mt-auto"
            >
              <Button className="w-full h-11 gap-2" variant="outline">
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
            cta: "pricing_plan",
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

function TestimonialsSection() {
  const { t, lang } = useLandingLang();
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("testTitle")}</h2>
          <p className="text-lg text-muted-foreground">{t("testSub")}</p>
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
              ? "Запишіться на коротку розмову, і ми покажемо, як Solo Bizz може спростити вашу роботу, упорядкувати записи, оплати та допомогти краще бачити фінансову картину вашої практики."
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
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("cta_clicked", { source_page: "/#final", cta: "telegram", lang })}
            >
              <Button size="lg" variant="outline" className="gap-2">
                <Send className="h-4 w-4" />
                {lang === "uk" ? "Написати в Telegram"
                  : lang === "fr" ? "Écrire sur Telegram"
                  : lang === "pl" ? "Napisz na Telegramie"
                  : "Telegram"}
              </Button>
            </a>
          </div>
          <p className="text-xs text-secondary-foreground/60 mt-5">
            {lang === "uk"
              ? "Можете залишити заявку, написати на email або перейти в Telegram — ми відповімо зручним для вас способом."
              : lang === "fr"
              ? "Laissez une demande, écrivez-nous par email ou sur Telegram — nous répondrons par le canal qui vous convient."
              : lang === "pl"
              ? "Zostaw zgłoszenie, napisz e-mail lub na Telegramie — odpowiemy w wygodny dla Ciebie sposób."
              : "Leave a request, email us, or message us on Telegram — we'll reply your way."}
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
              ? "Solo Bizz — це система для психологів, психотерапевтів, супервізорів, викладачів і приватних спеціалістів, які хочуть вести клієнтів, записи, оплати та бачити фінансовий результат без хаосу, Excel і ручного обліку."
              : "Solo Bizz is a system for psychologists, psychotherapists, supervisors, teachers and solo professionals who want to manage clients, sessions, payments and see real financial results — without chaos, Excel or manual tracking."}
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
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <Send className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Telegram</div>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("cta_clicked", { source_page: "/#contacts", cta: "telegram", lang })}
                  className="text-foreground hover:text-primary"
                >
                  {TELEGRAM_HANDLE}
                </a>
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
        { label: "Telegram", href: TELEGRAM_URL, external: true },
        { label: isUk ? "Телефон" : "Phone", href: `tel:${PHONE_NUMBER.replace(/\s+/g, "")}`, external: true },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-secondary/30 px-4 sm:px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xl font-bold text-foreground mb-2">Solo Bizz</div>
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
            © {new Date().getFullYear()} Solo Bizz. {isUk ? "Усі права захищені." : "All rights reserved."}
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
          </nav>
        </div>
      </div>
    </footer>
  );
}

// ── SEO (localized meta) ──────────────────────────────────────────────

const SEO_META: Record<Language, { title: string; description: string; ogTitle: string; ogDesc: string; ogLocale: string; htmlLang: string }> = {
  en: {
    title: "Solo Bizz — CRM for psychologists, coaches & solo practices",
    description: "Solo Bizz helps psychologists, therapists, coaches and tutors manage clients, sessions, payments and income — all in one calm, simple workspace.",
    ogTitle: "Solo Bizz — Run your solo practice without the chaos",
    ogDesc: "Clients, sessions, payments and income in one place. Built for psychologists, therapists, coaches and tutors.",
    ogLocale: "en_US",
    htmlLang: "en",
  },
  uk: {
    title: "Solo Bizz — CRM для психологів, коучів і приватної практики",
    description: "Solo Bizz допомагає психологам, терапевтам, коучам і репетиторам вести клієнтів, сесії, оплати та дохід — в одному простому робочому просторі.",
    ogTitle: "Solo Bizz — Керуйте приватною практикою без хаосу",
    ogDesc: "Клієнти, сесії, оплати та дохід в одному місці. Створено для психологів, терапевтів, коучів і репетиторів.",
    ogLocale: "uk_UA",
    htmlLang: "uk",
  },
  fr: {
    title: "Solo Bizz — CRM pour psychologues, coachs et pratiques solo",
    description: "Solo Bizz aide les psychologues, thérapeutes, coachs et tuteurs à gérer clients, séances, paiements et revenus — dans un espace simple et apaisé.",
    ogTitle: "Solo Bizz — Gérez votre pratique solo sans le chaos",
    ogDesc: "Clients, séances, paiements et revenus en un seul endroit. Conçu pour psychologues, thérapeutes, coachs et tuteurs.",
    ogLocale: "fr_FR",
    htmlLang: "fr",
  },
  pl: {
    title: "Solo Bizz — CRM dla psychologów, coachów i praktyki solo",
    description: "Solo Bizz pomaga psychologom, terapeutom, coachom i korepetytorom zarządzać klientami, sesjami, płatnościami i dochodem — w jednym prostym miejscu.",
    ogTitle: "Solo Bizz — Prowadź praktykę solo bez chaosu",
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
      <div className="min-h-screen bg-background">
        <LandingNav />
        <HeroSection />
        <PainSection />
        <AudienceSection />
        <DemoSection />
        <ComparisonSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <FinalCTA />
        <AboutContactsSection />
        <LandingFooter />
      </div>
    </LandingLangProvider>
  );
}

