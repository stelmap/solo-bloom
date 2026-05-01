/**
 * Shared translations for auth email templates.
 *
 * Supported languages: English (en, default), Ukrainian (uk), Polish (pl).
 * Add new languages by extending the `Lang` type and providing a full block.
 */

export type Lang = 'en' | 'uk' | 'pl'

export function normalizeLang(value: unknown): Lang {
  if (value === 'uk' || value === 'pl' || value === 'en') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower.startsWith('uk') || lower === 'ua') return 'uk'
    if (lower.startsWith('pl')) return 'pl'
  }
  return 'en'
}

interface SignupStrings {
  preview: string
  heading: string
  intro: (siteName: string) => string
  confirmIntro: (recipient: string) => string
  cta: string
  ignore: string
}

interface MagicLinkStrings {
  preview: string
  heading: string
  body: (siteName: string) => string
  cta: string
  ignore: string
}

interface RecoveryStrings {
  preview: string
  heading: string
  intro: string
  helper: string
}

interface InviteStrings {
  preview: string
  heading: string
  body: (siteName: string) => string
  cta: string
  ignore: string
}

interface EmailChangeStrings {
  preview: string
  heading: string
  body: (email: string, newEmail: string) => string
  confirmIntro: string
  cta: string
  warning: string
}

interface ReauthStrings {
  preview: string
  heading: string
  intro: string
  footer: string
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
  subjects: SubjectStrings
}

const en: LangStrings = {
  signup: {
    preview: 'Welcome — confirm your email',
    heading: 'Welcome aboard! 👋',
    intro: (siteName) => `Thanks for signing up for ${siteName}!`,
    confirmIntro: (recipient) => `Please confirm your email address (${recipient}) by clicking the button below:`,
    cta: 'Verify Email',
    ignore: "If you didn't create an account, you can safely ignore this email.",
  },
  magicLink: {
    preview: 'Your login link',
    heading: 'Your login link',
    body: (siteName) => `Click the button below to log in to ${siteName}. This link will expire shortly.`,
    cta: 'Log In',
    ignore: "If you didn't request this link, you can safely ignore this email.",
  },
  recovery: {
    preview: 'Your password reset code',
    heading: 'Reset your password',
    intro: 'We received a request to reset your password. Enter the code below in the app to continue.',
    helper:
      "This code is single-use and expires shortly. If you didn't request a password reset, you can safely ignore this email — your password will not be changed.",
  },
  invite: {
    preview: "You've been invited",
    heading: "You've been invited",
    body: (siteName) =>
      `You've been invited to join ${siteName}. Click the button below to accept the invitation and create your account.`,
    cta: 'Accept Invitation',
    ignore: "If you weren't expecting this invitation, you can safely ignore this email.",
  },
  emailChange: {
    preview: 'Confirm your email change',
    heading: 'Confirm your email change',
    body: (email, newEmail) => `You requested to change your email address from ${email} to ${newEmail}.`,
    confirmIntro: 'Click the button below to confirm this change:',
    cta: 'Confirm Email Change',
    warning: "If you didn't request this change, please secure your account immediately.",
  },
  reauthentication: {
    preview: 'Your verification code',
    heading: 'Confirm your identity',
    intro: "Use the code below to verify it's you:",
    footer: "This code will expire shortly. If you didn't request this, you can safely ignore this email.",
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
    preview: 'Ласкаво просимо — підтвердіть свою електронну пошту',
    heading: 'Вітаємо на борту! 👋',
    intro: (siteName) => `Дякуємо за реєстрацію в ${siteName}!`,
    confirmIntro: (recipient) =>
      `Будь ласка, підтвердіть свою електронну адресу (${recipient}), натиснувши кнопку нижче:`,
    cta: 'Підтвердити пошту',
    ignore: 'Якщо ви не створювали обліковий запис, просто проігноруйте цей лист.',
  },
  magicLink: {
    preview: 'Ваше посилання для входу',
    heading: 'Ваше посилання для входу',
    body: (siteName) =>
      `Натисніть кнопку нижче, щоб увійти до ${siteName}. Це посилання незабаром стане недійсним.`,
    cta: 'Увійти',
    ignore: 'Якщо ви не запитували це посилання, просто проігноруйте цей лист.',
  },
  recovery: {
    preview: 'Ваш код для скидання пароля',
    heading: 'Скиньте свій пароль',
    intro:
      'Ми отримали запит на скидання вашого пароля. Введіть код нижче у застосунку, щоб продовжити.',
    helper:
      'Цей код можна використати лише раз і він незабаром стане недійсним. Якщо ви не запитували скидання пароля, просто проігноруйте цей лист — ваш пароль не зміниться.',
  },
  invite: {
    preview: 'Вас запросили',
    heading: 'Вас запросили',
    body: (siteName) =>
      `Вас запросили приєднатися до ${siteName}. Натисніть кнопку нижче, щоб прийняти запрошення та створити обліковий запис.`,
    cta: 'Прийняти запрошення',
    ignore: 'Якщо ви не очікували цього запрошення, просто проігноруйте цей лист.',
  },
  emailChange: {
    preview: 'Підтвердіть зміну електронної пошти',
    heading: 'Підтвердіть зміну електронної пошти',
    body: (email, newEmail) =>
      `Ви запросили змінити свою електронну адресу з ${email} на ${newEmail}.`,
    confirmIntro: 'Натисніть кнопку нижче, щоб підтвердити цю зміну:',
    cta: 'Підтвердити зміну пошти',
    warning: 'Якщо ви не запитували цю зміну, негайно захистіть свій обліковий запис.',
  },
  reauthentication: {
    preview: 'Ваш код підтвердження',
    heading: 'Підтвердіть свою особу',
    intro: 'Використайте код нижче, щоб підтвердити, що це ви:',
    footer:
      'Цей код незабаром стане недійсним. Якщо ви не запитували цього, просто проігноруйте цей лист.',
  },
  subjects: {
    signup: 'Підтвердіть свою пошту',
    invite: 'Вас запросили',
    magiclink: 'Ваше посилання для входу',
    recovery: 'Скиньте свій пароль',
    email_change: 'Підтвердіть нову адресу пошти',
    reauthentication: 'Ваш код підтвердження',
  },
}

const pl: LangStrings = {
  signup: {
    preview: 'Witamy — potwierdź swój e-mail',
    heading: 'Witamy na pokładzie! 👋',
    intro: (siteName) => `Dziękujemy za rejestrację w ${siteName}!`,
    confirmIntro: (recipient) =>
      `Potwierdź swój adres e-mail (${recipient}), klikając przycisk poniżej:`,
    cta: 'Potwierdź e-mail',
    ignore: 'Jeśli nie zakładałeś konta, możesz bezpiecznie zignorować tę wiadomość.',
  },
  magicLink: {
    preview: 'Twój link do logowania',
    heading: 'Twój link do logowania',
    body: (siteName) =>
      `Kliknij przycisk poniżej, aby zalogować się do ${siteName}. Ten link wkrótce wygaśnie.`,
    cta: 'Zaloguj się',
    ignore: 'Jeśli nie prosiłeś o ten link, możesz bezpiecznie zignorować tę wiadomość.',
  },
  recovery: {
    preview: 'Twój kod do resetu hasła',
    heading: 'Zresetuj swoje hasło',
    intro:
      'Otrzymaliśmy prośbę o zresetowanie Twojego hasła. Wprowadź poniższy kod w aplikacji, aby kontynuować.',
    helper:
      'Ten kod jest jednorazowy i wkrótce wygaśnie. Jeśli nie prosiłeś o reset hasła, możesz bezpiecznie zignorować tę wiadomość — Twoje hasło nie zostanie zmienione.',
  },
  invite: {
    preview: 'Zostałeś zaproszony',
    heading: 'Zostałeś zaproszony',
    body: (siteName) =>
      `Zostałeś zaproszony do dołączenia do ${siteName}. Kliknij przycisk poniżej, aby przyjąć zaproszenie i utworzyć konto.`,
    cta: 'Przyjmij zaproszenie',
    ignore: 'Jeśli nie spodziewałeś się tego zaproszenia, możesz bezpiecznie zignorować tę wiadomość.',
  },
  emailChange: {
    preview: 'Potwierdź zmianę adresu e-mail',
    heading: 'Potwierdź zmianę adresu e-mail',
    body: (email, newEmail) =>
      `Poprosiłeś o zmianę swojego adresu e-mail z ${email} na ${newEmail}.`,
    confirmIntro: 'Kliknij przycisk poniżej, aby potwierdzić tę zmianę:',
    cta: 'Potwierdź zmianę e-maila',
    warning: 'Jeśli nie prosiłeś o tę zmianę, natychmiast zabezpiecz swoje konto.',
  },
  reauthentication: {
    preview: 'Twój kod weryfikacyjny',
    heading: 'Potwierdź swoją tożsamość',
    intro: 'Użyj poniższego kodu, aby potwierdzić, że to Ty:',
    footer:
      'Ten kod wkrótce wygaśnie. Jeśli nie prosiłeś o to, możesz bezpiecznie zignorować tę wiadomość.',
  },
  subjects: {
    signup: 'Potwierdź swój e-mail',
    invite: 'Zostałeś zaproszony',
    magiclink: 'Twój link do logowania',
    recovery: 'Zresetuj swoje hasło',
    email_change: 'Potwierdź nowy adres e-mail',
    reauthentication: 'Twój kod weryfikacyjny',
  },
}

const STRINGS: Record<Lang, LangStrings> = { en, uk, pl }

export function getStrings(lang: Lang | string | undefined | null): LangStrings {
  return STRINGS[normalizeLang(lang)]
}

export function getSubject(
  type: keyof SubjectStrings,
  lang: Lang | string | undefined | null,
): string {
  return STRINGS[normalizeLang(lang)].subjects[type]
}
