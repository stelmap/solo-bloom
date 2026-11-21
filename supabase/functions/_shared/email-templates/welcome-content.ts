// Signup-only presentation. Other authentication emails retain their existing translations.
export type WelcomeLanguage = 'uk' | 'en' | 'pl' | 'de' | 'fr' | 'ru'
export const SETUP_GUIDE_URL: string | undefined = undefined
export const WEBSITE_URL = 'https://solo-bizz.com'
export const SUPPORT_EMAIL = 'info@solo-bizz.com'

export function welcomeLanguage(value: unknown): WelcomeLanguage {
  if (typeof value !== 'string') return 'en'
  const code = value.toLowerCase().split(/[-_]/)[0]
  if (code === 'ua') return 'uk'
  return code === 'uk' || code === 'en' || code === 'pl' || code === 'de' || code === 'fr' || code === 'ru' ? code : 'en'
}

export function setupGuideUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}

interface WelcomeContent {
  title: string; intro: string; activation: string; cta: string; featuresTitle: string
  features: [string, string, string, string, string, string]
  valueTitle: string; values: [{ title: string; text: string }, { title: string; text: string }, { title: string; text: string }]
  setupTitle: string; setupText: string; setupCta: string; support: string; ignore: string; imageAlt: string
}

export const WELCOME_CONTENT: Record<WelcomeLanguage, WelcomeContent> = {
  uk: {
    title: 'Підтвердіть свою пошту та активуйте акаунт',
    intro: 'Дякуємо за реєстрацію в Solo .Bizz — системі для ведення приватної практики психолога або психотерапевта.',
    activation: 'Щоб почати користуватися Solo .Bizz, підтвердіть свою електронну адресу.', cta: 'Підтвердити пошту →',
    featuresTitle: 'Що ви отримуєте в Solo .Bizz',
    features: ['Календар та онлайн-запис', 'Клієнти', 'Оплати та рахунки', 'Фінанси', 'Групи та супервізії', 'Публічна сторінка спеціаліста'],
    valueTitle: 'Чому варто використовувати Solo .Bizz?',
    values: [
      { title: 'Більше клієнтів', text: 'Власна публічна сторінка, яку може індексувати Google, і онлайн-запис без зайвих листувань.' },
      { title: 'Менше рутини', text: 'Автоматизація розкладу, управління клієнтами та облік оплат.' },
      { title: 'Контроль і розвиток', text: 'Зрозумілі фінансові показники, аналітика практики та можливості для розвитку.' },
    ],
    setupTitle: 'Як швидко налаштувати систему?', setupText: 'Покрокові інструкції, відео та поради для старту.', setupCta: 'Перейти до інструкцій →',
    support: 'Якщо у вас виникли запитання — напишіть нам, ми завжди раді допомогти!',
    ignore: 'Якщо ви не створювали акаунт Solo .Bizz, просто проігноруйте цей лист.', imageAlt: 'Календар Solo .Bizz',
  },
  en: {
    title: 'Confirm your email and activate your account',
    intro: 'Thank you for registering with Solo .Bizz — a system for managing a psychologist’s or psychotherapist’s private practice.',
    activation: 'To start using Solo .Bizz, confirm your email address.', cta: 'Confirm email →',
    featuresTitle: 'What you get with Solo .Bizz',
    features: ['Calendar and online booking', 'Clients', 'Payments and invoices', 'Finances', 'Groups and supervision', 'Public specialist profile'],
    valueTitle: 'Why use Solo .Bizz?',
    values: [
      { title: 'More clients', text: 'Your own public profile that Google can index, and online booking without lengthy messaging.' },
      { title: 'Less routine', text: 'Schedule automation, client management and payment tracking.' },
      { title: 'Control and growth', text: 'Clear financial indicators, practice analytics and opportunities for growth.' },
    ],
    setupTitle: 'How to get set up quickly?', setupText: 'Step-by-step instructions, videos and tips to get started.', setupCta: 'Open instructions →',
    support: 'If you have any questions, write to us — we’re always happy to help!',
    ignore: 'If you did not create a Solo .Bizz account, simply ignore this email.', imageAlt: 'Solo .Bizz calendar',
  },
  pl: {
    title: 'Potwierdź swój e-mail i aktywuj konto',
    intro: 'Dziękujemy za rejestrację w Solo .Bizz — systemie do prowadzenia prywatnej praktyki psychologa lub psychoterapeuty.',
    activation: 'Aby zacząć korzystać z Solo .Bizz, potwierdź swój adres e-mail.', cta: 'Potwierdź e-mail →',
    featuresTitle: 'Co otrzymujesz w Solo .Bizz',
    features: ['Kalendarz i zapisy online', 'Klienci', 'Płatności i faktury', 'Finanse', 'Grupy i superwizje', 'Publiczny profil specjalisty'],
    valueTitle: 'Dlaczego warto korzystać z Solo .Bizz?',
    values: [
      { title: 'Więcej klientów', text: 'Własny publiczny profil, który Google może indeksować, oraz zapisy online bez zbędnych wiadomości.' },
      { title: 'Mniej rutyny', text: 'Automatyzacja harmonogramu, zarządzanie klientami i ewidencja płatności.' },
      { title: 'Kontrola i rozwój', text: 'Czytelne wskaźniki finansowe, analityka praktyki i możliwości rozwoju.' },
    ],
    setupTitle: 'Jak szybko skonfigurować system?', setupText: 'Instrukcje krok po kroku, filmy i wskazówki na początek.', setupCta: 'Przejdź do instrukcji →',
    support: 'Jeśli masz pytania — napisz do nas, zawsze chętnie pomożemy!',
    ignore: 'Jeśli nie zakładałeś konta Solo .Bizz, po prostu zignoruj tę wiadomość.', imageAlt: 'Kalendarz Solo .Bizz',
  },
  de: {
    title: 'Bestätigen Sie Ihre E-Mail und aktivieren Sie Ihr Konto',
    intro: 'Vielen Dank für Ihre Registrierung bei Solo .Bizz — dem System zur Verwaltung einer psychologischen oder psychotherapeutischen Privatpraxis.',
    activation: 'Bestätigen Sie Ihre E-Mail-Adresse, um Solo .Bizz zu nutzen.', cta: 'E-Mail bestätigen →',
    featuresTitle: 'Das erhalten Sie mit Solo .Bizz',
    features: ['Kalender und Onlinebuchung', 'Klienten', 'Zahlungen und Rechnungen', 'Finanzen', 'Gruppen und Supervision', 'Öffentliches Fachprofil'],
    valueTitle: 'Warum Solo .Bizz nutzen?',
    values: [
      { title: 'Mehr Klienten', text: 'Ihr eigenes öffentliches Profil, das Google indexieren kann, und Onlinebuchung ohne lange Nachrichtenwechsel.' },
      { title: 'Weniger Routine', text: 'Terminplanung automatisieren, Klienten verwalten und Zahlungen erfassen.' },
      { title: 'Kontrolle und Wachstum', text: 'Klare Finanzkennzahlen, Praxisanalysen und Entwicklungsmöglichkeiten.' },
    ],
    setupTitle: 'Wie richten Sie das System schnell ein?', setupText: 'Schritt-für-Schritt-Anleitungen, Videos und Tipps für den Start.', setupCta: 'Zur Anleitung →',
    support: 'Bei Fragen schreiben Sie uns — wir helfen Ihnen gerne!',
    ignore: 'Wenn Sie kein Solo .Bizz-Konto erstellt haben, ignorieren Sie diese E-Mail einfach.', imageAlt: 'Solo .Bizz-Kalender',
  },
  fr: {
    title: 'Confirmez votre e-mail et activez votre compte',
    intro: 'Merci de vous être inscrit à Solo .Bizz — le système de gestion de cabinet privé pour psychologues et psychothérapeutes.',
    activation: 'Pour commencer à utiliser Solo .Bizz, confirmez votre adresse e-mail.', cta: 'Confirmer l’e-mail →',
    featuresTitle: 'Ce que vous obtenez avec Solo .Bizz',
    features: ['Agenda et réservation en ligne', 'Clients', 'Paiements et factures', 'Finances', 'Groupes et supervision', 'Profil public du spécialiste'],
    valueTitle: 'Pourquoi utiliser Solo .Bizz ?',
    values: [
      { title: 'Plus de clients', text: 'Votre propre profil public que Google peut indexer, et la réservation en ligne sans échanges interminables.' },
      { title: 'Moins de tâches répétitives', text: 'Automatisation du planning, gestion des clients et suivi des paiements.' },
      { title: 'Maîtrise et développement', text: 'Des indicateurs financiers clairs, l’analyse du cabinet et des possibilités de développement.' },
    ],
    setupTitle: 'Comment configurer rapidement le système ?', setupText: 'Instructions pas à pas, vidéos et conseils pour démarrer.', setupCta: 'Voir les instructions →',
    support: 'Si vous avez des questions, écrivez-nous — nous serons ravis de vous aider !',
    ignore: 'Si vous n’avez pas créé de compte Solo .Bizz, ignorez simplement cet e-mail.', imageAlt: 'Agenda Solo .Bizz',
  },
  ru: {
    title: 'Подтвердите свою почту и активируйте аккаунт',
    intro: 'Спасибо за регистрацию в Solo .Bizz — системе для ведения частной практики психолога или психотерапевта.',
    activation: 'Чтобы начать пользоваться Solo .Bizz, подтвердите свой адрес электронной почты.', cta: 'Подтвердить почту →',
    featuresTitle: 'Что вы получаете в Solo .Bizz',
    features: ['Календарь и онлайн-запись', 'Клиенты', 'Оплаты и счета', 'Финансы', 'Группы и супервизии', 'Публичная страница специалиста'],
    valueTitle: 'Почему стоит использовать Solo .Bizz?',
    values: [
      { title: 'Больше клиентов', text: 'Собственная публичная страница, которую может индексировать Google, и онлайн-запись без лишних переписок.' },
      { title: 'Меньше рутины', text: 'Автоматизация расписания, управление клиентами и учёт оплат.' },
      { title: 'Контроль и развитие', text: 'Понятные финансовые показатели, аналитика практики и возможности для развития.' },
    ],
    setupTitle: 'Как быстро настроить систему?', setupText: 'Пошаговые инструкции, видео и советы для старта.', setupCta: 'Перейти к инструкциям →',
    support: 'Если у вас возникли вопросы — напишите нам, мы всегда рады помочь!',
    ignore: 'Если вы не создавали аккаунт Solo .Bizz, просто проигнорируйте это письмо.', imageAlt: 'Календарь Solo .Bizz',
  },
}

// Immutable approved landing screenshot assets; never append recipient data or tokens.
export const WELCOME_IMAGES: Record<WelcomeLanguage, string> = {
  uk: `${WEBSITE_URL}/__l5e/assets-v1/0249854e-9f44-4986-9353-6055705cc499/calendar-client-names-uk.png`,
  en: `${WEBSITE_URL}/__l5e/assets-v1/177a4de3-88bf-482e-8a8f-6c25a5bb249e/calendar-client-names-en.png`,
  de: `${WEBSITE_URL}/__l5e/assets-v1/c4dbd509-2ed7-4649-90be-4ad2c3d3b239/calendar-localized-labels-de.png`,
  pl: `${WEBSITE_URL}/__l5e/assets-v1/42d4f0da-e43b-4e4b-b1e3-17f1d446efb3/calendar-localized-labels-pl.png`,
  fr: `${WEBSITE_URL}/__l5e/assets-v1/f0700509-f7f9-4cfb-a254-4a0965e25aff/calendar-localized-labels-fr.png`,
  ru: `${WEBSITE_URL}/__l5e/assets-v1/6dadd00c-c9fa-4043-8351-159bb4a2c35d/calendar-localized-labels-ru.png`,
}

export const WELCOME_THEME = {
  white: '#ffffff', ink: '#12172f', text: '#535c75', muted: '#727a90',
  orange: '#ff6b00', peach: '#fff2e7', lavender: '#f3efff', purple: '#6551d8', rule: '#e9e8f2',
  font: "'DM Sans', 'Segoe UI', Arial, sans-serif",
}