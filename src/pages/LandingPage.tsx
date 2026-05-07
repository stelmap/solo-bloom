import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { PublicFooter } from "@/components/PublicFooter";
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
  Quote, MessageCircle,
} from "lucide-react";
import manualTrackingImg from "@/assets/manual-tracking-spreadsheet.png";
import soloBizzPreviewImg from "@/assets/solobizz-client-profile.png";

// ── Configurable external links (replace as needed) ───────────────────
const YOUTUBE_URL = "https://www.youtube.com/";
const CONTACT_OR_CALENDAR_URL = "mailto:hello@solo-bizz.com";

// ── Local landing-page copy (EN / FR / UK / PL) ───────────────────────

type Copy = Record<Language, string>;
const C = {
  // Nav
  navAudience: { en: "Who it's for", fr: "Pour qui", uk: "Кому підходить", pl: "Dla kogo" },
  navHow: { en: "Comparison", fr: "Comparaison", uk: "Порівняння", pl: "Porównanie" },
  navPricing: { en: "Pricing", fr: "Tarifs", uk: "Ціни", pl: "Cennik" },
  navFaq: { en: "FAQ", fr: "FAQ", uk: "Питання", pl: "FAQ" },
  navLogin: { en: "Log in", fr: "Connexion", uk: "Увійти", pl: "Zaloguj się" },
  navTry: { en: "Try free", fr: "Essai gratuit", uk: "Спробувати", pl: "Wypróbuj" },

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
  heroCta: { en: "Try it", fr: "Essayer", uk: "Спробувати", pl: "Wypróbuj" },
  heroVideo: { en: "Watch video", fr: "Voir la vidéo", uk: "Подивитися відео", pl: "Zobacz wideo" },
  heroSubCta: {
    en: "No credit card. No setup. Just try.",
    fr: "Sans carte. Sans configuration. Essayez.",
    uk: "Без картки. Без складних налаштувань. Просто спробуйте.",
    pl: "Bez karty. Bez konfiguracji. Po prostu wypróbuj.",
  },

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

  // Demo
  demoTitle: {
    en: "See how your practice could look in 60 seconds",
    fr: "Voyez à quoi votre cabinet peut ressembler en 60 secondes",
    uk: "Подивіться, як може виглядати ваша практика за 60 секунд",
    pl: "Zobacz, jak Twoja praktyka mogłaby wyglądać w 60 sekund",
  },
  demoText: {
    en: "Demo workspace with real examples of clients, sessions, payments and income.",
    fr: "Espace démo avec de vrais exemples de clients, séances, paiements et revenus.",
    uk: "Демо-простір з реальними прикладами клієнтів, сесій, оплат і доходу.",
    pl: "Demonstracyjna przestrzeń z prawdziwymi przykładami klientów, sesji, płatności i dochodu.",
  },
  demoCta: { en: "Open demo workspace", fr: "Ouvrir l'espace démo", uk: "Відкрити демо-простір", pl: "Otwórz przestrzeń demo" },

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

  // Pricing
  pricingTitle: { en: "Choose your practice", fr: "Choisissez votre formule", uk: "Оберіть свою практику", pl: "Wybierz swoją praktykę" },
  pricingSub: { en: "Both plans start with a free trial. No credit card.", fr: "Les deux formules démarrent par un essai gratuit. Sans carte.", uk: "Обидва плани починаються з безкоштовного періоду. Без картки.", pl: "Oba plany zaczynają się od bezpłatnego okresu próbnego. Bez karty." },
  monthly: { en: "Monthly", fr: "Mensuel", uk: "Щомісяця", pl: "Miesięcznie" },
  quarterly: { en: "Quarterly", fr: "Trimestriel", uk: "Щокварталу", pl: "Kwartalnie" },
  yearly: { en: "Yearly", fr: "Annuel", uk: "Щороку", pl: "Rocznie" },
  save20: { en: "Save 20%", fr: "−20 %", uk: "−20%", pl: "Oszczędź 20%" },
  save40: { en: "Save 40%", fr: "−40 %", uk: "−40%", pl: "Oszczędź 40%" },
  perMonth: { en: "/month", fr: "/mois", uk: "/міс", pl: "/miesiąc" },
  billedMo: { en: "Billed monthly", fr: "Facturé mensuellement", uk: "Оплата щомісяця", pl: "Rozliczane co miesiąc" },
  billedQ: { en: "Billed every 3 months", fr: "Facturé tous les 3 mois", uk: "Оплата раз на 3 місяці", pl: "Rozliczane co 3 miesiące" },
  billedY: { en: "Billed yearly", fr: "Facturé annuellement", uk: "Оплата раз на рік", pl: "Rozliczane co rok" },
  soloName: { en: "Solo Practice", fr: "Pratique Solo", uk: "Solo-практика", pl: "Solo Practice" },
  soloDesc: { en: "For control and clarity", fr: "Pour le contrôle et la clarté", uk: "Для контролю та ясності", pl: "Dla kontroli i przejrzystości" },
  soloF1: { en: "Clients", fr: "Clients", uk: "Клієнти", pl: "Klienci" },
  soloF2: { en: "Sessions", fr: "Séances", uk: "Сесії", pl: "Sesje" },
  soloF3: { en: "Calendar", fr: "Calendrier", uk: "Календар", pl: "Kalendarz" },
  soloF4: { en: "Basic finances", fr: "Finances de base", uk: "Базові фінанси", pl: "Podstawowe finanse" },
  proName: { en: "Pro Practice", fr: "Pratique Pro", uk: "Pro-практика", pl: "Pro Practice" },
  proDesc: { en: "For growth and stable income", fr: "Pour la croissance et un revenu stable", uk: "Для зростання та стабільного доходу", pl: "Dla rozwoju i stabilnego dochodu" },
  popular: { en: "Most popular", fr: "Le plus populaire", uk: "Найпопулярніший", pl: "Najpopularniejszy" },
  proF1: { en: "Everything in Solo", fr: "Tout de Solo", uk: "Усе з Solo", pl: "Wszystko w Solo" },
  proF2: { en: "Supervision", fr: "Supervision", uk: "Супервізія", pl: "Superwizja" },
  proF3: { en: "Group sessions", fr: "Séances de groupe", uk: "Групові сесії", pl: "Sesje grupowe" },
  proF4: { en: "Advanced financial tracking", fr: "Suivi financier avancé", uk: "Розширений фінансовий облік", pl: "Zaawansowane śledzenie finansów" },
  startTrial: { en: "Start free trial", fr: "Démarrer l'essai gratuit", uk: "Почати безкоштовний період", pl: "Rozpocznij okres próbny" },

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
    en: "No. You can open the demo workspace and see how the system works without any complex setup.",
    fr: "Non. Vous pouvez ouvrir l'espace démo et voir le fonctionnement sans configuration complexe.",
    uk: "Ні. Ви можете відкрити демо-простір і побачити, як працює система, без складних налаштувань.",
    pl: "Nie. Możesz otworzyć demo i zobaczyć, jak działa system, bez skomplikowanej konfiguracji.",
  },
  faq2Q: { en: "Will it work if I work alone?", fr: "Est-ce adapté si je travaille seul·e ?", uk: "Чи підійде система, якщо я працюю сама?", pl: "Czy nada się, jeśli pracuję sam(a)?" },
  faq2A: {
    en: "Yes. Solo Bizz is built exactly for solo practices where one person manages clients, sessions, payments and finances.",
    fr: "Oui. Solo Bizz est conçu pour les pratiques solo où une seule personne gère clients, séances, paiements et finances.",
    uk: "Так. Solo Bizz створений саме для приватних практик, де одна людина веде клієнтів, сесії, оплати й фінанси.",
    pl: "Tak. Solo Bizz powstał właśnie dla solowych praktyk, gdzie jedna osoba prowadzi klientów, sesje, płatności i finanse.",
  },
  faq3Q: { en: "Can I run group sessions or supervisions?", fr: "Puis-je gérer des séances de groupe ou des supervisions ?", uk: "Чи можна вести групові сесії або супервізії?", pl: "Czy mogę prowadzić sesje grupowe lub superwizje?" },
  faq3A: {
    en: "Yes. The system supports individual and group sessions, attendance and payment control.",
    fr: "Oui. Le système gère séances individuelles et de groupe, présence et paiements.",
    uk: "Так. Система має підтримувати індивідуальні та групові сесії, контроль присутності й оплат.",
    pl: "Tak. System obsługuje sesje indywidualne i grupowe, kontrolę obecności i płatności.",
  },
  faq4Q: { en: "Can I use it for teaching or tutoring?", fr: "Puis-je l'utiliser pour l'enseignement ou les cours particuliers ?", uk: "Чи можна використовувати систему для викладання або репетиторства?", pl: "Czy mogę używać go do nauczania lub korepetycji?" },
  faq4A: {
    en: "Yes. The system fits specialists who work with students, lessons, payments and learning progress.",
    fr: "Oui. Le système convient aux pros qui suivent élèves, cours, paiements et progression.",
    uk: "Так. Система підходить для спеціалістів, які працюють з учнями, заняттями, оплатами та прогресом навчання.",
    pl: "Tak. System pasuje dla osób pracujących z uczniami, zajęciami, płatnościami i postępami nauki.",
  },
  faq5Q: { en: "Is there free access or a demo?", fr: "Y a-t-il un accès gratuit ou une démo ?", uk: "Чи є безкоштовний доступ або демо?", pl: "Czy jest darmowy dostęp lub demo?" },
  faq5A: {
    en: "Yes. You can try the system through the demo or registration flow according to the current product logic.",
    fr: "Oui. Vous pouvez essayer via la démo ou via l'inscription, selon la logique produit actuelle.",
    uk: "Так. Користувач може спробувати систему через демо або реєстраційний flow згідно з поточною логікою продукту.",
    pl: "Tak. Możesz wypróbować przez demo lub rejestrację, zgodnie z bieżącą logiką produktu.",
  },
  faq6Q: { en: "Do I need a credit card to try it?", fr: "Faut-il une carte bancaire pour essayer ?", uk: "Чи потрібна банківська картка, щоб спробувати?", pl: "Czy potrzebuję karty, żeby wypróbować?" },
  faq6A: {
    en: "No. A credit card is not required for your first look at the demo workspace.",
    fr: "Non. Aucune carte n'est nécessaire pour découvrir l'espace démo.",
    uk: "Ні. Для першого знайомства з демо-простором банківська картка не потрібна.",
    pl: "Nie. Karta nie jest potrzebna do pierwszego zapoznania z demo.",
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

function LandingLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => getStoredLang());
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
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <PrimaryCta label={t("heroCta")} source="/" cta="hero" className="text-base px-8 h-12" />
            <VideoCta label={t("heroVideo")} source="/" className="text-base px-8 h-12" />
          </div>
          <p className="text-sm text-muted-foreground">{t("heroSubCta")}</p>
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
          <PrimaryCta label={t("demoCta")} source="/#demo" cta="demo" className="text-base px-8 h-12" />
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
    <section id="comparison" className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("cmpTitle")}</h2>
          <p className="text-lg text-muted-foreground">{t("cmpSub")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-7 rounded-2xl bg-card border border-border">
            <h3 className="text-xl font-semibold text-muted-foreground mb-5">{t("cmpManual")}</h3>
            <div className="mb-5 rounded-lg overflow-hidden border border-border bg-muted/40">
              <img
                src={manualTrackingImg}
                alt="Spreadsheet with manual client and payment tracking"
                loading="lazy"
                className="w-full h-auto block grayscale-[30%] opacity-90"
              />
            </div>
            <ul className="space-y-3">
              {manual.map((k) => (
                <li key={k} className="flex items-start gap-3 text-foreground/80">
                  <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-7 rounded-2xl bg-primary/5 border-2 border-primary/30">
            <h3 className="text-xl font-semibold text-foreground mb-5">{t("cmpSolo")}</h3>
            <ul className="space-y-3">
              {solo.map((k) => (
                <li key={k} className="flex items-start gap-3 text-foreground">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base font-medium">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <PrimaryCta label={t("cmpCta")} source="/#comparison" cta="comparison" className="text-base px-8 h-12" />
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────

function PricingSection() {
  const { t } = useLandingLang();
  const [cycle, setCycle] = useState<Cycle>("monthly");

  const computed = {
    monthly:   { solo: 19,  pro: 49,  billed: t("billedMo") },
    quarterly: { solo: 15,  pro: 39,  billed: t("billedQ") },
    yearly:    { solo: 11,  pro: 29,  billed: t("billedY") },
  } as const;

  const data = computed[cycle];

  const tabs: { id: Cycle; label: string; badge?: string }[] = [
    { id: "monthly", label: t("monthly") },
    { id: "quarterly", label: t("quarterly"), badge: t("save20") },
    { id: "yearly", label: t("yearly"), badge: t("save40") },
  ];

  return (
    <BillingCycleContext.Provider value={cycle}>
    <section id="pricing" className="py-20 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("pricingTitle")}</h2>
          <p className="text-lg text-muted-foreground">{t("pricingSub")}</p>
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

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <PlanCard
            plan="solo"
            name={t("soloName")}
            desc={t("soloDesc")}
            price={data.solo}
            perMonth={t("perMonth")}
            billed={data.billed}
            features={[t("soloF1"), t("soloF2"), t("soloF3"), t("soloF4")]}
            cta={t("startTrial")}
          />
          <PlanCard
            plan="pro"
            name={t("proName")}
            desc={t("proDesc")}
            price={data.pro}
            perMonth={t("perMonth")}
            billed={data.billed}
            features={[t("proF1"), t("proF2"), t("proF3"), t("proF4")]}
            cta={t("startTrial")}
            popular
            popularLabel={t("popular")}
          />
        </div>
      </div>
    </section>
    </BillingCycleContext.Provider>
  );
}

function PlanCard({
  plan, name, desc, price, perMonth, billed, features, cta, popular, popularLabel,
}: {
  plan: "solo" | "pro";
  name: string; desc: string; price: number; perMonth: string; billed: string;
  features: string[]; cta: string;
  popular?: boolean; popularLabel?: string;
}) {
  const { lang } = useLandingLang();
  const billing_cycle = useBillingCycle();
  return (
    <div className={`relative p-7 rounded-2xl bg-card border-2 ${
      popular ? "border-primary shadow-lg" : "border-border"
    }`}>
      {popular && popularLabel && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {popularLabel}
        </span>
      )}
      <h3 className="text-xl font-semibold text-foreground">{name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-5">{desc}</p>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-4xl font-bold text-foreground">€{price}</span>
        <span className="text-muted-foreground text-base">{perMonth}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6">{billed}</p>
      <ul className="space-y-2.5 mb-7">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-3 text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm">{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to={`/auth?plan=${plan}_${billing_cycle}`}
        onClick={() =>
          track("cta_clicked", {
            source_page: `/#pricing-${billing_cycle}-${plan}`,
            cta: "pricing_plan",
            plan_type: plan,
            billing_cycle,
            lang,
          })
        }
        className="block"
      >
        <Button className="w-full h-11 gap-2" variant={popular ? "default" : "outline"}>
          {cta} <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────

const NATALIA_PARAGRAPHS = [
  "Справді вона бере на себе частину роботи, яку я зараз виконую вручну в блокнотику, і там все почьоркано)).",
  "Класно, що працює нагадування і для психолога і для клієнта, правда ще не розібралась чи може клієнт бачити вільні віконечка для запису, це було би зручно.",
  "Графіки за підсумками місяця чи року дають загальну картину куди я рухаюсь, яка динаміка, і що можна планувати на потім.",
  "Цікава штука з прогнозуванням прибутку, це щось нове для мене, особливо сподобалось що це прогнозування дає реалістину картинку: то можу я дозволити собі навчання цього місяця чи нє?))",
  "Загалом, виглядає що програмка дає відчуття: все серйозно, це бізнес дєтка, і це хороше відчуття, воно справді потрібне для системного розвитку.",
  "Впевнена, це буде корисно для багатьох фахівців",
];

const SVITLANA_PARAGRAPHS = [
  "мені подобається. Дуже корисна штука. Зразу видно на якому ти світі і що відбувається. Дякую що розширила мій всесвіт.",
];

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
  const { t } = useLandingLang();
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
            role="Психотерапевт"
            paragraphs={NATALIA_PARAGRAPHS}
            expandable
          />
          <TestimonialCard
            name="Світлана"
            role="Психолог"
            paragraphs={SVITLANA_PARAGRAPHS}
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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <PrimaryCta label={t("finalCta")} source="/" cta="final" className="text-base px-8 h-12" />
          <VideoCta label={t("heroVideo")} source="/#final" className="text-base px-8 h-12" />
        </div>

        <div className="mt-14 max-w-xl mx-auto rounded-2xl border border-sidebar-border bg-accent/30 p-6 sm:p-8 text-center">
          <h3 className="text-xl font-semibold text-secondary-foreground mb-2">{t("doubtTitle")}</h3>
          <p className="text-base text-secondary-foreground/80 mb-5">{t("doubtText")}</p>
          <a
            href={CONTACT_OR_CALENDAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("cta_clicked", { source_page: "/#final", cta: "talk_to_us", lang })}
          >
            <Button variant="outline" size="lg" className="gap-2">
              <MessageCircle className="h-4 w-4" /> {t("doubtCta")}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  useEffect(() => {
    track("landing_view");
  }, []);

  return (
    <LandingLangProvider>
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
        <PublicFooter />
      </div>
    </LandingLangProvider>
  );
}
