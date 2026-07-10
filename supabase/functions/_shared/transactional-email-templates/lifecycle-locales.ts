// Locale strings for account lifecycle emails.
// Extracted into a plain TS module (no npm imports) so both React Email
// templates AND lightweight Deno tests can consume them.
//
// The template subject shown in the inbox AND the `template_name` /
// language propagated into `email_send_log` are derived from these strings,
// so asserting them here is what makes the lifecycle-email localization
// end-to-end contract testable.

export type Lang = "en" | "uk" | "ru" | "pl" | "fr";
export const SUPPORTED_LANGS: readonly Lang[] = ["en", "uk", "ru", "pl", "fr"];

export function normalizeLang(v: unknown): Lang {
  const s = String(v ?? "").toLowerCase().slice(0, 2) as Lang;
  return (SUPPORTED_LANGS as readonly string[]).includes(s) ? s : "en";
}

export interface WarningStrings {
  htmlLang: string; preview: string; subject: string; heading: string;
  greeting: string; p1: string; p2: string; p3: string;
  cta: string; p4: string; sign: string;
}

export interface FinalStrings {
  htmlLang: string; preview: string; subject: string; heading: string;
  greeting: string; p1: string; p2: string; sign: string;
}

export const WARNING_STRINGS: Record<Lang, WarningStrings> = {
  en: {
    htmlLang: "en",
    preview: "Your SoloBizz account is scheduled for deletion",
    subject: "Your SoloBizz account is scheduled for deletion",
    heading: "Your account is scheduled for deletion",
    greeting: "Hello,",
    p1: "We noticed that you haven't been using your SoloBizz account recently. To keep our platform secure and up to date, your account has been scheduled for deletion.",
    p2: "Your account will be permanently deleted in 7 days unless you log in.",
    p3: "Simply sign in during the next seven days and the deletion process will automatically be cancelled.",
    cta: "Login to SoloBizz",
    p4: "If you no longer plan to use SoloBizz, no action is required.",
    sign: "Thank you,\nThe SoloBizz Team",
  },
  uk: {
    htmlLang: "uk",
    preview: "Ваш акаунт SoloBizz заплановано до видалення",
    subject: "Ваш акаунт SoloBizz заплановано до видалення",
    heading: "Ваш акаунт заплановано до видалення",
    greeting: "Вітаємо!",
    p1: "Ми помітили, що останнім часом ви не користуєтеся своїм акаунтом SoloBizz.",
    p2: "Ваш акаунт буде остаточно видалено через 7 днів, якщо ви не увійдете до системи.",
    p3: "Щоб зберегти акаунт, достатньо просто увійти до SoloBizz протягом наступних 7 днів. Після входу процес видалення буде автоматично скасовано.",
    cta: "Увійти до SoloBizz",
    p4: "Якщо ви більше не плануєте користуватися SoloBizz, нічого робити не потрібно.",
    sign: "З повагою,\nКоманда SoloBizz",
  },
  ru: {
    htmlLang: "ru",
    preview: "Ваш аккаунт SoloBizz запланирован к удалению",
    subject: "Ваш аккаунт SoloBizz запланирован к удалению",
    heading: "Ваш аккаунт запланирован к удалению",
    greeting: "Здравствуйте!",
    p1: "Мы заметили, что в последнее время вы не пользуетесь своим аккаунтом SoloBizz.",
    p2: "Ваш аккаунт будет окончательно удалён через 7 дней, если вы не войдёте в систему.",
    p3: "Чтобы сохранить аккаунт, достаточно войти в SoloBizz в течение ближайших 7 дней — процесс удаления будет автоматически отменён.",
    cta: "Войти в SoloBizz",
    p4: "Если вы больше не планируете пользоваться SoloBizz, ничего делать не нужно.",
    sign: "С уважением,\nКоманда SoloBizz",
  },
  pl: {
    htmlLang: "pl",
    preview: "Twoje konto SoloBizz zostało zaplanowane do usunięcia",
    subject: "Twoje konto SoloBizz zostało zaplanowane do usunięcia",
    heading: "Twoje konto zostało zaplanowane do usunięcia",
    greeting: "Cześć,",
    p1: "Zauważyliśmy, że ostatnio nie korzystasz ze swojego konta SoloBizz.",
    p2: "Twoje konto zostanie trwale usunięte za 7 dni, jeśli się nie zalogujesz.",
    p3: "Aby zachować konto, wystarczy zalogować się do SoloBizz w ciągu najbliższych 7 dni — proces usuwania zostanie automatycznie anulowany.",
    cta: "Zaloguj się do SoloBizz",
    p4: "Jeśli nie planujesz już korzystać z SoloBizz, nie musisz nic robić.",
    sign: "Dziękujemy,\nZespół SoloBizz",
  },
  fr: {
    htmlLang: "fr",
    preview: "Votre compte SoloBizz est programmé pour suppression",
    subject: "Votre compte SoloBizz est programmé pour suppression",
    heading: "Votre compte est programmé pour suppression",
    greeting: "Bonjour,",
    p1: "Nous avons remarqué que vous n'avez pas utilisé votre compte SoloBizz récemment.",
    p2: "Votre compte sera définitivement supprimé dans 7 jours si vous ne vous connectez pas.",
    p3: "Pour conserver votre compte, il suffit de vous connecter à SoloBizz au cours des 7 prochains jours — la suppression sera automatiquement annulée.",
    cta: "Se connecter à SoloBizz",
    p4: "Si vous ne souhaitez plus utiliser SoloBizz, aucune action n'est nécessaire.",
    sign: "Merci,\nL’équipe SoloBizz",
  },
};

export const FINAL_STRINGS: Record<Lang, FinalStrings> = {
  en: {
    htmlLang: "en",
    preview: "Your SoloBizz account has been deleted",
    subject: "Your SoloBizz account has been deleted",
    heading: "Your account has been deleted",
    greeting: "Hello,",
    p1: "Your SoloBizz account has been permanently deleted because no activity was detected during the 7-day notification period.",
    p2: "If you'd like to use SoloBizz again, simply create a new account.",
    sign: "Thank you,\nThe SoloBizz Team",
  },
  uk: {
    htmlLang: "uk",
    preview: "Ваш акаунт SoloBizz було видалено",
    subject: "Ваш акаунт SoloBizz було видалено",
    heading: "Ваш акаунт було видалено",
    greeting: "Вітаємо!",
    p1: "Оскільки ви не увійшли до SoloBizz протягом 7 днів після отримання попередження, ваш акаунт було остаточно видалено.",
    p2: "Якщо в майбутньому ви захочете знову користуватися SoloBizz, ви можете створити новий акаунт у будь-який час.",
    sign: "Дякуємо, що користувалися SoloBizz.\nКоманда SoloBizz",
  },
  ru: {
    htmlLang: "ru",
    preview: "Ваш аккаунт SoloBizz был удалён",
    subject: "Ваш аккаунт SoloBizz был удалён",
    heading: "Ваш аккаунт был удалён",
    greeting: "Здравствуйте!",
    p1: "Поскольку в течение 7 дней после уведомления вы не вошли в SoloBizz, ваш аккаунт был окончательно удалён.",
    p2: "Если в будущем вы захотите снова пользоваться SoloBizz, вы можете создать новый аккаунт в любое время.",
    sign: "Спасибо, что пользовались SoloBizz.\nКоманда SoloBizz",
  },
  pl: {
    htmlLang: "pl",
    preview: "Twoje konto SoloBizz zostało usunięte",
    subject: "Twoje konto SoloBizz zostało usunięte",
    heading: "Twoje konto zostało usunięte",
    greeting: "Cześć,",
    p1: "Ponieważ nie zalogowałeś się do SoloBizz w ciągu 7 dni od powiadomienia, Twoje konto zostało trwale usunięte.",
    p2: "Jeśli w przyszłości zechcesz ponownie korzystać z SoloBizz, możesz w każdej chwili utworzyć nowe konto.",
    sign: "Dziękujemy za korzystanie z SoloBizz.\nZespół SoloBizz",
  },
  fr: {
    htmlLang: "fr",
    preview: "Votre compte SoloBizz a été supprimé",
    subject: "Votre compte SoloBizz a été supprimé",
    heading: "Votre compte a été supprimé",
    greeting: "Bonjour,",
    p1: "Étant donné que vous ne vous êtes pas connecté à SoloBizz dans les 7 jours suivant l'avertissement, votre compte a été définitivement supprimé.",
    p2: "Si vous souhaitez utiliser SoloBizz à nouveau, vous pouvez créer un nouveau compte à tout moment.",
    sign: "Merci d'avoir utilisé SoloBizz.\nL’équipe SoloBizz",
  },
};
