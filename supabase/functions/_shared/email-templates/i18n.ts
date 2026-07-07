/**
 * Shared translations for ALL SoloBizz outgoing emails (auth + transactional).
 *
 * Supported languages: English (en, default), Ukrainian (uk), Polish (pl),
 * French (fr). Add new languages by extending the `Lang` type and providing
 * a full block.
 */

export type Lang = 'en' | 'uk' | 'pl' | 'fr'

export function normalizeLang(value: unknown): Lang {
  if (value === 'uk' || value === 'pl' || value === 'en' || value === 'fr') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower.startsWith('uk') || lower === 'ua') return 'uk'
    if (lower.startsWith('pl')) return 'pl'
    if (lower.startsWith('fr')) return 'fr'
  }
  return 'en'
}

interface SignupStrings {
  preview: string
  tagline: string
  heroTitle: string
  heroSub: string
  greeting: string
  intro: (siteName: string) => string
  signingInAs: string
  cta: string
  ignore: string
  features: { calendar: string; calendarDesc: string; finance: string; financeDesc: string; metrics: string; metricsDesc: string }
}

interface MagicLinkStrings {
  preview: string
  tagline: string
  heroTitle: string
  heroSub: string
  body: (siteName: string) => string
  cta: string
  ignore: string
}

interface RecoveryStrings {
  preview: string
  tagline: string
  heroTitle: string
  heroSub: string
  intro: string
  helper: string
  ctaFallback: string
}

interface InviteStrings {
  preview: string
  tagline: string
  heroTitle: string
  heroSub: string
  body: (siteName: string) => string
  cta: string
  ignore: string
}

interface EmailChangeStrings {
  preview: string
  tagline: string
  heroTitle: string
  heroSub: string
  body: (email: string, newEmail: string) => string
  confirmIntro: string
  cta: string
  warning: string
}

interface ReauthStrings {
  preview: string
  tagline: string
  heroTitle: string
  heroSub: string
  intro: string
  footer: string
}

interface FooterStrings {
  brandLine: string
  ignoreNote: string
  contact: string
}

interface SubjectStrings {
  signup: string
  invite: string
  magiclink: string
  recovery: string
  email_change: string
  reauthentication: string
}

interface LangStrings {
  signup: SignupStrings
  magicLink: MagicLinkStrings
  recovery: RecoveryStrings
  invite: InviteStrings
  emailChange: EmailChangeStrings
  reauthentication: ReauthStrings
  footer: FooterStrings
  subjects: SubjectStrings
}

const TAGLINE = 'Business · Manager'

const en: LangStrings = {
  signup: {
    preview: 'Confirm your email — one step from owning your practice',
    tagline: TAGLINE,
    heroTitle: 'Confirm your email',
    heroSub: "You're one step away from owning your practice.",
    greeting: 'Hey there 👋',
    intro: (siteName) => `Thanks for signing up for ${siteName}. Please confirm your email address so we can activate your account.`,
    signingInAs: 'Signing in as',
    cta: 'Verify my email',
    ignore: "If you didn't create an account, you can safely ignore this email.",
    features: {
      calendar: 'Smart calendar', calendarDesc: 'Sessions, booking & reminders',
      finance: 'Finance tracker', financeDesc: 'Revenue & margins at a glance',
      metrics: 'Practice metrics', metricsDesc: 'Data-driven decisions',
    },
  },
  magicLink: {
    preview: 'Your login link is ready',
    tagline: TAGLINE,
    heroTitle: 'Your login link',
    heroSub: 'One click and you’re back in your practice.',
    body: (siteName) => `Click the button below to log in to ${siteName}. This link will expire shortly.`,
    cta: 'Log in',
    ignore: "If you didn't request this link, you can safely ignore this email.",
  },
  recovery: {
    preview: 'Reset your password',
    tagline: TAGLINE,
    heroTitle: 'Reset your password',
    heroSub: 'Use the code below in the app to continue.',
    intro: 'We received a request to reset your password. Enter the code below in the app to continue.',
    helper: "This code is single-use and expires shortly. If you didn't request a password reset, you can safely ignore this email — your password will not be changed.",
    ctaFallback: 'Open SoloBizz',
  },
  invite: {
    preview: "You've been invited to SoloBizz",
    tagline: TAGLINE,
    heroTitle: "You've been invited",
    heroSub: 'Join your team in SoloBizz.',
    body: (siteName) => `You've been invited to join ${siteName}. Click the button below to accept the invitation and create your account.`,
    cta: 'Accept invitation',
    ignore: "If you weren't expecting this invitation, you can safely ignore this email.",
  },
  emailChange: {
    preview: 'Confirm your email change',
    tagline: TAGLINE,
    heroTitle: 'Confirm your email change',
    heroSub: 'A quick confirmation keeps your account safe.',
    body: (email, newEmail) => `You requested to change your email address from ${email} to ${newEmail}.`,
    confirmIntro: 'Click the button below to confirm this change:',
    cta: 'Confirm email change',
    warning: "If you didn't request this change, please secure your account immediately.",
  },
  reauthentication: {
    preview: 'Your verification code',
    tagline: TAGLINE,
    heroTitle: 'Confirm your identity',
    heroSub: "Use the code below to verify it's you.",
    intro: "Use the code below to verify it's you:",
    footer: "This code will expire shortly. If you didn't request this, you can safely ignore this email.",
  },
  footer: {
    brandLine: '© SoloBizz · solo-bizz.com',
    ignoreNote: "If you didn't create an account, safely ignore this email.",
    contact: 'info@solo-bizz.com',
  },
  subjects: {
    signup: 'Confirm your email',
    invite: "You've been invited",
    magiclink: 'Your login link',
    recovery: 'Reset your password',
    email_change: 'Confirm your new email',
    reauthentication: 'Your verification code',
  },
}

const uk: LangStrings = {
  signup: {
    preview: 'Підтвердіть пошту — один крок до власної практики',
    tagline: TAGLINE,
    heroTitle: 'Підтвердіть свою пошту',
    heroSub: 'Один крок — і ваша практика у ваших руках.',
    greeting: 'Вітаємо 👋',
    intro: (siteName) => `Дякуємо за реєстрацію в ${siteName}. Будь ласка, підтвердіть свою електронну адресу, щоб активувати акаунт.`,
    signingInAs: 'Вхід виконано як',
    cta: 'Підтвердити пошту',
    ignore: 'Якщо ви не створювали обліковий запис, просто проігноруйте цей лист.',
    features: {
      calendar: 'Розумний календар', calendarDesc: 'Сеанси, бронювання та нагадування',
      finance: 'Фінансовий облік', financeDesc: 'Дохід і маржа з одного погляду',
      metrics: 'Метрики практики', metricsDesc: 'Рішення на основі даних',
    },
  },
  magicLink: {
    preview: 'Ваше посилання для входу готове',
    tagline: TAGLINE,
    heroTitle: 'Ваше посилання для входу',
    heroSub: 'Один клік — і ви знову у своїй практиці.',
    body: (siteName) => `Натисніть кнопку нижче, щоб увійти до ${siteName}. Це посилання незабаром стане недійсним.`,
    cta: 'Увійти',
    ignore: 'Якщо ви не запитували це посилання, просто проігноруйте цей лист.',
  },
  recovery: {
    preview: 'Скиньте свій пароль',
    tagline: TAGLINE,
    heroTitle: 'Скиньте свій пароль',
    heroSub: 'Введіть код нижче у застосунку, щоб продовжити.',
    intro: 'Ми отримали запит на скидання вашого пароля. Введіть код нижче у застосунку, щоб продовжити.',
    helper: 'Цей код можна використати лише раз і він незабаром стане недійсним. Якщо ви не запитували скидання пароля, просто проігноруйте цей лист — ваш пароль не зміниться.',
    ctaFallback: 'Відкрити SoloBizz',
  },
  invite: {
    preview: 'Вас запросили до SoloBizz',
    tagline: TAGLINE,
    heroTitle: 'Вас запросили',
    heroSub: 'Приєднуйтесь до команди в SoloBizz.',
    body: (siteName) => `Вас запросили приєднатися до ${siteName}. Натисніть кнопку нижче, щоб прийняти запрошення та створити обліковий запис.`,
    cta: 'Прийняти запрошення',
    ignore: 'Якщо ви не очікували цього запрошення, просто проігноруйте цей лист.',
  },
  emailChange: {
    preview: 'Підтвердіть зміну електронної пошти',
    tagline: TAGLINE,
    heroTitle: 'Підтвердіть зміну пошти',
    heroSub: 'Швидке підтвердження для безпеки акаунту.',
    body: (email, newEmail) => `Ви запросили змінити свою електронну адресу з ${email} на ${newEmail}.`,
    confirmIntro: 'Натисніть кнопку нижче, щоб підтвердити цю зміну:',
    cta: 'Підтвердити зміну',
    warning: 'Якщо ви не запитували цю зміну, негайно захистіть свій обліковий запис.',
  },
  reauthentication: {
    preview: 'Ваш код підтвердження',
    tagline: TAGLINE,
    heroTitle: 'Підтвердіть свою особу',
    heroSub: 'Використайте код нижче, щоб підтвердити, що це ви.',
    intro: 'Використайте код нижче, щоб підтвердити, що це ви:',
    footer: 'Цей код незабаром стане недійсним. Якщо ви не запитували цього, просто проігноруйте цей лист.',
  },
  footer: {
    brandLine: '© SoloBizz · solo-bizz.com',
    ignoreNote: 'Якщо ви не створювали обліковий запис, просто проігноруйте цей лист.',
    contact: 'info@solo-bizz.com',
  },
  subjects: {
    signup: 'Підтвердіть свою пошту',
    invite: 'Вас запросили до SoloBizz',
    magiclink: 'Ваше посилання для входу в SoloBizz',
    recovery: 'Скиньте свій пароль SoloBizz',
    email_change: 'Підтвердіть нову адресу пошти',
    reauthentication: 'Ваш код підтвердження',
  },
}

const pl: LangStrings = {
  signup: {
    preview: 'Potwierdź swój e-mail — krok od własnej praktyki',
    tagline: TAGLINE,
    heroTitle: 'Potwierdź swój e-mail',
    heroSub: 'Jeden krok dzieli Cię od własnej praktyki.',
    greeting: 'Cześć 👋',
    intro: (siteName) => `Dziękujemy za rejestrację w ${siteName}. Potwierdź swój adres e-mail, abyśmy mogli aktywować Twoje konto.`,
    signingInAs: 'Logowanie jako',
    cta: 'Potwierdź e-mail',
    ignore: 'Jeśli nie zakładałeś konta, możesz bezpiecznie zignorować tę wiadomość.',
    features: {
      calendar: 'Inteligentny kalendarz', calendarDesc: 'Sesje, rezerwacje i przypomnienia',
      finance: 'Finanse', financeDesc: 'Przychody i marże w jednym miejscu',
      metrics: 'Metryki praktyki', metricsDesc: 'Decyzje oparte na danych',
    },
  },
  magicLink: {
    preview: 'Twój link do logowania jest gotowy',
    tagline: TAGLINE,
    heroTitle: 'Twój link do logowania',
    heroSub: 'Jedno kliknięcie i wracasz do swojej praktyki.',
    body: (siteName) => `Kliknij przycisk poniżej, aby zalogować się do ${siteName}. Ten link wkrótce wygaśnie.`,
    cta: 'Zaloguj się',
    ignore: 'Jeśli nie prosiłeś o ten link, możesz bezpiecznie zignorować tę wiadomość.',
  },
  recovery: {
    preview: 'Zresetuj swoje hasło',
    tagline: TAGLINE,
    heroTitle: 'Zresetuj swoje hasło',
    heroSub: 'Wprowadź poniższy kod w aplikacji, aby kontynuować.',
    intro: 'Otrzymaliśmy prośbę o zresetowanie Twojego hasła. Wprowadź poniższy kod w aplikacji, aby kontynuować.',
    helper: 'Ten kod jest jednorazowy i wkrótce wygaśnie. Jeśli nie prosiłeś o reset hasła, możesz bezpiecznie zignorować tę wiadomość — Twoje hasło nie zostanie zmienione.',
    ctaFallback: 'Otwórz SoloBizz',
  },
  invite: {
    preview: 'Zostałeś zaproszony do SoloBizz',
    tagline: TAGLINE,
    heroTitle: 'Zostałeś zaproszony',
    heroSub: 'Dołącz do zespołu w SoloBizz.',
    body: (siteName) => `Zostałeś zaproszony do dołączenia do ${siteName}. Kliknij przycisk poniżej, aby przyjąć zaproszenie i utworzyć konto.`,
    cta: 'Przyjmij zaproszenie',
    ignore: 'Jeśli nie spodziewałeś się tego zaproszenia, możesz bezpiecznie zignorować tę wiadomość.',
  },
  emailChange: {
    preview: 'Potwierdź zmianę adresu e-mail',
    tagline: TAGLINE,
    heroTitle: 'Potwierdź zmianę adresu e-mail',
    heroSub: 'Szybkie potwierdzenie chroni Twoje konto.',
    body: (email, newEmail) => `Poprosiłeś o zmianę swojego adresu e-mail z ${email} na ${newEmail}.`,
    confirmIntro: 'Kliknij przycisk poniżej, aby potwierdzić tę zmianę:',
    cta: 'Potwierdź zmianę',
    warning: 'Jeśli nie prosiłeś o tę zmianę, natychmiast zabezpiecz swoje konto.',
  },
  reauthentication: {
    preview: 'Twój kod weryfikacyjny',
    tagline: TAGLINE,
    heroTitle: 'Potwierdź swoją tożsamość',
    heroSub: 'Użyj poniższego kodu, aby potwierdzić, że to Ty.',
    intro: 'Użyj poniższego kodu, aby potwierdzić, że to Ty:',
    footer: 'Ten kod wkrótce wygaśnie. Jeśli nie prosiłeś o to, możesz bezpiecznie zignorować tę wiadomość.',
  },
  footer: {
    brandLine: '© SoloBizz · solo-bizz.com',
    ignoreNote: 'Jeśli nie zakładałeś konta, bezpiecznie zignoruj tę wiadomość.',
    contact: 'info@solo-bizz.com',
  },
  subjects: {
    signup: 'Potwierdź swój e-mail',
    invite: 'Zostałeś zaproszony do SoloBizz',
    magiclink: 'Twój link do logowania w SoloBizz',
    recovery: 'Zresetuj swoje hasło SoloBizz',
    email_change: 'Potwierdź nowy adres e-mail',
    reauthentication: 'Twój kod weryfikacyjny',
  },
}

const fr: LangStrings = {
  signup: {
    preview: 'Confirmez votre e-mail — à un pas de votre pratique',
    tagline: TAGLINE,
    heroTitle: 'Confirmez votre e-mail',
    heroSub: 'Plus qu’une étape avant de piloter votre pratique.',
    greeting: 'Bonjour 👋',
    intro: (siteName) => `Merci de vous être inscrit·e à ${siteName}. Confirmez votre adresse e-mail pour activer votre compte.`,
    signingInAs: 'Connexion en tant que',
    cta: 'Confirmer mon e-mail',
    ignore: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail en toute sécurité.",
    features: {
      calendar: 'Agenda intelligent', calendarDesc: 'Séances, réservations et rappels',
      finance: 'Suivi financier', financeDesc: 'Revenus et marges en un coup d’œil',
      metrics: 'Indicateurs', metricsDesc: 'Des décisions fondées sur les données',
    },
  },
  magicLink: {
    preview: 'Votre lien de connexion est prêt',
    tagline: TAGLINE,
    heroTitle: 'Votre lien de connexion',
    heroSub: 'Un clic et vous êtes de retour dans votre pratique.',
    body: (siteName) => `Cliquez sur le bouton ci-dessous pour vous connecter à ${siteName}. Ce lien expirera bientôt.`,
    cta: 'Se connecter',
    ignore: "Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet e-mail en toute sécurité.",
  },
  recovery: {
    preview: 'Réinitialisez votre mot de passe',
    tagline: TAGLINE,
    heroTitle: 'Réinitialisez votre mot de passe',
    heroSub: 'Entrez le code ci-dessous dans l’application pour continuer.',
    intro: 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Entrez le code ci-dessous dans l’application pour continuer.',
    helper: "Ce code est à usage unique et expire rapidement. Si vous n'avez pas demandé de réinitialisation, ignorez cet e-mail — votre mot de passe ne sera pas modifié.",
    ctaFallback: 'Ouvrir SoloBizz',
  },
  invite: {
    preview: 'Vous avez été invité·e sur SoloBizz',
    tagline: TAGLINE,
    heroTitle: 'Vous avez été invité·e',
    heroSub: 'Rejoignez votre équipe sur SoloBizz.',
    body: (siteName) => `Vous avez été invité·e à rejoindre ${siteName}. Cliquez sur le bouton ci-dessous pour accepter l'invitation et créer votre compte.`,
    cta: "Accepter l'invitation",
    ignore: "Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail en toute sécurité.",
  },
  emailChange: {
    preview: 'Confirmez le changement d’adresse e-mail',
    tagline: TAGLINE,
    heroTitle: 'Confirmez votre nouvelle adresse',
    heroSub: 'Une confirmation rapide protège votre compte.',
    body: (email, newEmail) => `Vous avez demandé à changer votre adresse e-mail de ${email} à ${newEmail}.`,
    confirmIntro: 'Cliquez sur le bouton ci-dessous pour confirmer ce changement :',
    cta: 'Confirmer le changement',
    warning: "Si vous n'avez pas demandé ce changement, sécurisez immédiatement votre compte.",
  },
  reauthentication: {
    preview: 'Votre code de vérification',
    tagline: TAGLINE,
    heroTitle: 'Confirmez votre identité',
    heroSub: 'Utilisez le code ci-dessous pour vérifier que c’est bien vous.',
    intro: 'Utilisez le code ci-dessous pour vérifier que c’est bien vous :',
    footer: "Ce code expirera bientôt. Si vous n'avez pas demandé cela, ignorez cet e-mail en toute sécurité.",
  },
  footer: {
    brandLine: '© SoloBizz · solo-bizz.com',
    ignoreNote: "Si vous n'avez pas créé de compte, ignorez cet e-mail en toute sécurité.",
    contact: 'info@solo-bizz.com',
  },
  subjects: {
    signup: 'Confirmez votre e-mail',
    invite: 'Vous avez été invité·e sur SoloBizz',
    magiclink: 'Votre lien de connexion SoloBizz',
    recovery: 'Réinitialisez votre mot de passe SoloBizz',
    email_change: 'Confirmez votre nouvelle adresse',
    reauthentication: 'Votre code de vérification',
  },
}

const STRINGS: Record<Lang, LangStrings> = { en, uk, pl, fr }

export function getStrings(lang: Lang | string | undefined | null): LangStrings {
  return STRINGS[normalizeLang(lang)]
}

export function getSubject(
  type: keyof SubjectStrings,
  lang: Lang | string | undefined | null,
): string {
  return STRINGS[normalizeLang(lang)].subjects[type]
}
