// Localized copy for the redesigned landing page sections (promo bar, hero
// showcase, outcome strip, product tour, workflow, before/after).
// Ukrainian is the source language; EN / PL / FR / RU keys are prepared.

import type { AppLanguage } from "@/i18n/translations";

type Localized = Partial<Record<AppLanguage, string>> & { en: string };

export const LANDING_COPY = {
  promoBarText: {
    en: "Support Ukrainian psychotherapists — 50% off",
    uk: "Підтримка українських психотерапевтів — знижка 50%",
    pl: "Wsparcie ukraińskich psychoterapeutów — 50% zniżki",
    fr: "Soutien aux psychothérapeutes ukrainiens — −50 %",
    ru: "Поддержка украинских психотерапевтов — скидка 50%",
  },
  promoBarCta: {
    en: "Activate discount",
    uk: "Активувати знижку",
    pl: "Aktywuj zniżkę",
    fr: "Activer la remise",
    ru: "Активировать скидку",
  },
  promoBarClose: {
    en: "Close banner",
    uk: "Закрити банер",
    pl: "Zamknij baner",
    fr: "Fermer la bannière",
    ru: "Закрыть баннер",
  },
  promoActivated: {
    en: "50% discount activated. It is applied automatically at Stripe checkout.",
    uk: "Знижку 50% активовано. Вона автоматично застосовується у Stripe.",
    pl: "Zniżka 50% aktywowana. Zostanie zastosowana automatycznie w Stripe.",
    fr: "Réduction de 50 % activée. Elle est appliquée automatiquement dans Stripe.",
    ru: "Скидка 50% активирована. Она применяется автоматически в Stripe.",
  },

  // Outcome strip
  outcomeTitle: {
    en: "From routine to result",
    uk: "Від рутини до результату",
    pl: "Od rutyny do rezultatu",
    fr: "De la routine au résultat",
    ru: "От рутины к результату",
  },
  outcome1Title: { en: "Less routine", uk: "Менше рутини", pl: "Mniej rutyny", fr: "Moins de routine", ru: "Меньше рутины" },
  outcome1Text: {
    en: "Bookings, reminders and finances run automatically.",
    uk: "Автоматизація записів, нагадувань і фінансів.",
    pl: "Automatyzacja zapisów, przypomnień i finansów.",
    fr: "Réservations, rappels et finances automatisés.",
    ru: "Автоматизация записей, напоминаний и финансов.",
  },
  outcome2Title: { en: "Order and structure", uk: "Системність і порядок", pl: "Porządek i system", fr: "Ordre et structure", ru: "Системность и порядок" },
  outcome2Text: {
    en: "Clients, sessions and documents always at hand.",
    uk: "Клієнти, сесії та документи завжди під рукою.",
    pl: "Klienci, sesje i dokumenty zawsze pod ręką.",
    fr: "Clients, séances et documents toujours à portée de main.",
    ru: "Клиенты, сессии и документы всегда под рукой.",
  },
  outcome3Title: { en: "More time for clients", uk: "Більше часу для клієнтів", pl: "Więcej czasu dla klientów", fr: "Plus de temps pour les clients", ru: "Больше времени для клиентов" },
  outcome3Text: {
    en: "Less admin — more attention for your practice.",
    uk: "Менше адміністрації — більше уваги практиці.",
    pl: "Mniej administracji — więcej uwagi dla praktyki.",
    fr: "Moins d'administratif — plus d'attention pour votre pratique.",
    ru: "Меньше администрирования — больше внимания практике.",
  },

  // Product tour
  tourEyebrow: {
    en: "ONE SYSTEM FOR THE WHOLE PRACTICE",
    uk: "ОДНА СИСТЕМА ДЛЯ ВСІЄЇ ПРАКТИКИ",
    pl: "JEDEN SYSTEM DLA CAŁEJ PRAKTYKI",
    fr: "UN SYSTÈME POUR TOUTE LA PRATIQUE",
    ru: "ОДНА СИСТЕМА ДЛЯ ВСЕЙ ПРАКТИКИ",
  },
  tourTitle: {
    en: "See how SoloBizz works for you",
    uk: "Подивіться, як SoloBizz працює для вас",
    pl: "Zobacz, jak SoloBizz pracuje dla Ciebie",
    fr: "Découvrez comment SoloBizz travaille pour vous",
    ru: "Посмотрите, как SoloBizz работает для вас",
  },
  tourText: {
    en: "Pick a scenario and see the real product screen.",
    uk: "Оберіть сценарій — і побачте реальний екран системи.",
    pl: "Wybierz scenariusz i zobacz prawdziwy ekran systemu.",
    fr: "Choisissez un scénario et voyez un écran réel du produit.",
    ru: "Выберите сценарий — и увидите реальный экран системы.",
  },
  tabCalendar: { en: "Calendar", uk: "Календар", pl: "Kalendarz", fr: "Agenda", ru: "Календарь" },
  tabCalendarTitle: { en: "Organise your time", uk: "Організуйте свій час", pl: "Zorganizuj swój czas", fr: "Organisez votre temps", ru: "Организуйте своё время" },
  tabCalendarBody: {
    en: "Plan sessions, manage your schedule and see the whole week without clashes.",
    uk: "Плануйте сесії, керуйте розкладом і бачте весь тиждень без накладок.",
    pl: "Planuj sesje, zarządzaj grafikiem i widz cały tydzień bez kolizji.",
    fr: "Planifiez vos séances et visualisez toute la semaine sans conflits.",
    ru: "Планируйте сессии, управляйте расписанием и видьте всю неделю без накладок.",
  },
  tabToday: { en: "Today", uk: "Сьогодні", pl: "Dziś", fr: "Aujourd'hui", ru: "Сегодня" },
  tabTodayTitle: { en: "Know what needs attention", uk: "Знайте, що потребує уваги", pl: "Wiedz, co wymaga uwagi", fr: "Sachez ce qui demande votre attention", ru: "Знайте, что требует внимания" },
  tabTodayBody: {
    en: "Sessions, new requests, debts and clients without a next booking — on one screen.",
    uk: "Сесії, нові запити, борги та клієнти без наступного запису — на одному екрані.",
    pl: "Sesje, nowe zgłoszenia, długi i klienci bez kolejnego terminu — na jednym ekranie.",
    fr: "Séances, nouvelles demandes, impayés et clients sans prochain rendez-vous — sur un seul écran.",
    ru: "Сессии, новые заявки, долги и клиенты без следующей записи — на одном экране.",
  },
  tabClients: { en: "Clients", uk: "Клієнти", pl: "Klienci", fr: "Clients", ru: "Клиенты" },
  tabClientsTitle: { en: "Keep the full history", uk: "Зберігайте повну історію", pl: "Zachowaj pełną historię", fr: "Conservez tout l'historique", ru: "Храните полную историю" },
  tabClientsBody: {
    en: "Sessions, notes, documents and payments gathered in the client card.",
    uk: "Сесії, нотатки, документи та оплати зібрані у картці клієнта.",
    pl: "Sesje, notatki, dokumenty i płatności w karcie klienta.",
    fr: "Séances, notes, documents et paiements réunis dans la fiche client.",
    ru: "Сессии, заметки, документы и оплаты собраны в карточке клиента.",
  },
  tabFinance: { en: "Finance", uk: "Фінанси", pl: "Finanse", fr: "Finances", ru: "Финансы" },
  tabFinanceTitle: { en: "See the real result", uk: "Бачте реальний результат", pl: "Zobacz realny wynik", fr: "Voyez le résultat réel", ru: "Видьте реальный результат" },
  tabFinanceBody: {
    en: "Income, expenses, debts and practice dynamics are calculated automatically.",
    uk: "Доходи, витрати, борги й динаміка практики розраховуються автоматично.",
    pl: "Przychody, koszty, długi i dynamika praktyki liczone automatycznie.",
    fr: "Revenus, dépenses, impayés et dynamique calculés automatiquement.",
    ru: "Доходы, расходы, долги и динамика практики рассчитываются автоматически.",
  },

  // Workflow
  workflowEyebrow: { en: "FROM BOOKING TO PAYMENT", uk: "ВІД ЗАПИСУ ДО ОПЛАТИ", pl: "OD ZAPISU DO PŁATNOŚCI", fr: "DE LA RÉSERVATION AU PAIEMENT", ru: "ОТ ЗАПИСИ ДО ОПЛАТЫ" },
  workflowTitle: {
    en: "One connected process instead of five tools",
    uk: "Один зв'язаний процес замість п'яти інструментів",
    pl: "Jeden spójny proces zamiast pięciu narzędzi",
    fr: "Un processus connecté au lieu de cinq outils",
    ru: "Один связанный процесс вместо пяти инструментов",
  },
  step1: { en: "Client books online", uk: "Клієнт записується", pl: "Klient zapisuje się", fr: "Le client réserve", ru: "Клиент записывается" },
  step2: { en: "Session confirmed", uk: "Сесія підтверджується", pl: "Sesja potwierdzona", fr: "Séance confirmée", ru: "Сессия подтверждается" },
  step3: { en: "You run the session", uk: "Ви проводите сесію", pl: "Prowadzisz sesję", fr: "Vous menez la séance", ru: "Вы проводите сессию" },
  step4: { en: "Payment recorded", uk: "Оплата фіксується", pl: "Płatność zapisana", fr: "Paiement enregistré", ru: "Оплата фиксируется" },
  step5: { en: "Balance updated", uk: "Баланс оновлюється", pl: "Saldo zaktualizowane", fr: "Solde mis à jour", ru: "Баланс обновляется" },
  step6: { en: "Report is ready", uk: "Звіт готовий", pl: "Raport gotowy", fr: "Rapport prêt", ru: "Отчёт готов" },

  beforeLabel: { en: "BEFORE", uk: "БУЛО", pl: "BYŁO", fr: "AVANT", ru: "БЫЛО" },
  beforeTitle: { en: "Scattered across places", uk: "Розкидано по різних місцях", pl: "Rozproszone w różnych miejscach", fr: "Éparpillé un peu partout", ru: "Разбросано по разным местам" },
  before1: { en: "Calendar and messengers", uk: "Календар і месенджери", pl: "Kalendarz i komunikatory", fr: "Agenda et messageries", ru: "Календарь и мессенджеры" },
  before2: { en: "Spreadsheets for payments", uk: "Таблиці для оплат", pl: "Arkusze do płatności", fr: "Tableurs pour les paiements", ru: "Таблицы для оплат" },
  before3: { en: "Notes kept separately", uk: "Нотатки окремо", pl: "Notatki osobno", fr: "Notes à part", ru: "Заметки отдельно" },
  before4: { en: "Manual reports", uk: "Звіти вручну", pl: "Raporty ręcznie", fr: "Rapports manuels", ru: "Отчёты вручную" },
  afterLabel: { en: "WITH SOLOBIZZ", uk: "СТАЛО З SOLOBIZZ", pl: "Z SOLOBIZZ", fr: "AVEC SOLOBIZZ", ru: "СТАЛО С SOLOBIZZ" },
  afterTitle: { en: "The whole practice in sync", uk: "Уся практика синхронізована", pl: "Cała praktyka zsynchronizowana", fr: "Toute la pratique synchronisée", ru: "Вся практика синхронизирована" },
  after1: { en: "Online booking and calendar", uk: "Онлайн-запис і календар", pl: "Zapisy online i kalendarz", fr: "Réservation en ligne et agenda", ru: "Онлайн-запись и календарь" },
  after2: { en: "Payments and debts under control", uk: "Оплати та борги під контролем", pl: "Płatności i długi pod kontrolą", fr: "Paiements et impayés maîtrisés", ru: "Оплаты и долги под контролем" },
  after3: { en: "Automatic reminders", uk: "Автоматичні нагадування", pl: "Automatyczne przypomnienia", fr: "Rappels automatiques", ru: "Автоматические напоминания" },
  after4: { en: "Finances in real time", uk: "Фінанси в реальному часі", pl: "Finanse w czasie rzeczywistym", fr: "Finances en temps réel", ru: "Финансы в реальном времени" },

  // Hero showcase
  heroAnnotation1: {
    en: "Clients and finances in one profile",
    uk: "Клієнти та фінанси в одному профілі",
    pl: "Klienci i finanse w jednym profilu",
    fr: "Clients et finances dans un seul profil",
    ru: "Клиенты и финансы в одном профиле",
  },
  heroAnnotation2: {
    en: "Automatic reminders and payment control",
    uk: "Автоматичні нагадування й контроль оплат",
    pl: "Automatyczne przypomnienia i kontrola płatności",
    fr: "Rappels automatiques et suivi des paiements",
    ru: "Автоматические напоминания и контроль оплат",
  },
  altCalendar: { en: "SoloBizz calendar", uk: "Календар SoloBizz", pl: "Kalendarz SoloBizz", fr: "Agenda SoloBizz", ru: "Календарь SoloBizz" },
  altClient: { en: "SoloBizz client card", uk: "Картка клієнта SoloBizz", pl: "Karta klienta SoloBizz", fr: "Fiche client SoloBizz", ru: "Карточка клиента SoloBizz" },
  altFinance: { en: "SoloBizz financial analytics", uk: "Фінансова аналітика SoloBizz", pl: "Analityka finansowa SoloBizz", fr: "Analytique financière SoloBizz", ru: "Финансовая аналитика SoloBizz" },
  altDashboard: { en: "SoloBizz today dashboard", uk: "Панель «Сьогодні» SoloBizz", pl: "Pulpit „Dziś” SoloBizz", fr: "Tableau de bord SoloBizz", ru: "Панель «Сегодня» SoloBizz" },
} satisfies Record<string, Localized>;

export type LandingCopyKey = keyof typeof LANDING_COPY;

export function lt(lang: AppLanguage | string | undefined, key: LandingCopyKey): string {
  const entry = LANDING_COPY[key] as Partial<Record<string, string>>;
  return entry[(lang ?? "en") as string] ?? entry.en ?? "";
}
