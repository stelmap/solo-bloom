import type { AppLanguage } from "@/i18n/translations";

export const referralNavLabel: Record<AppLanguage, string> = {
  uk: "Реферальна програма", en: "Referral program", ru: "Реферальная программа", pl: "Program poleceń", fr: "Programme de parrainage",
};

const uk = {
  title: "Реферальна програма",
  subtitle: "Запрошуйте колег та отримуйте винагороду за їхні підписки.",
  invited: "Запрошено", invitedTip: "Унікальні користувачі, які зареєструвалися за вашим посиланням.",
  active: "Активних рефералів", activeTip: "Запрошені користувачі з активною платною підпискою.",
  earned: "Нараховано", earnedTip: "Усі підтверджені винагороди мінус повернення коштів.",
  withdrawable: "Доступно до виводу", withdrawableTip: "Залишок після покриття вашої підписки, резервів і попередніх виплат.",
  toCover: "До покриття ліцензії", toCoverTip: "Скільки ще потрібно, щоб покрити вашу підписку за поточний період.",
  rules: (p: string, m: number) => `Отримуйте ${p}% від кожної успішно оплаченої підписки запрошеного користувача протягом ${m} міс. Нарахована винагорода спочатку покриває вартість вашої власної підписки Solo .Bizz. Надлишок можна вивести.`,
  rulesLead: "Як працює винагорода:",
  myLink: "Моє реферальне посилання", copy: "Копіювати", copied: "Посилання скопійовано", invite: "Запросити друга", share: "Поділитися:",
  inviteTitle: "Запросити друга", inviteText: (url: string) => `Привіт! Я веду практику в Solo .Bizz — календар, клієнти й оплати в одному місці. Спробуй безкоштовно за моїм посиланням: ${url}`,
  copyMessage: "Копіювати повідомлення", messageCopied: "Повідомлення скопійовано",
  coverage: "Покриття власної ліцензії", tariff: "Тариф", perPeriod: { monthly: "міс", quarterly: "квартал", yearly: "рік" } as Record<string, string>,
  covered: (a: string, b: string) => `Покрито ${a} з ${b}`, remaining: "Залишилося покрити",
  fullyCovered: "Ваша підписка покрита реферальними нарахуваннями.",
  surplus: "Доступно до виводу", noEarnings: "Запросіть колег, щоб почати покривати вартість своєї підписки.",
  noSubscription: "У вас немає активної платної підписки — уся винагорода доступна до виводу.",
  coverageNote: "Виплати стають доступними після перевищення суми вашої підписки.",
  referrals: "Мої реферали", search: "Пошук за ім'ям", allStatuses: "Усі статуси",
  colUser: "Користувач", colDate: "Дата реєстрації", colStatus: "Статус", colPlan: "Тариф", colEarned: "Нараховано", colPeriod: "Період винагороди",
  sortDate: "За датою", sortEarned: "За нарахуванням",
  status: { registered: "Зареєстрований", awaiting_payment: "Очікує першої оплати", active: "Активна підписка", paused: "Призупинена підписка", canceled: "Скасована підписка", reward_ended: "Період винагороди завершено" } as Record<string, string>,
  noReferrals: "Поки немає рефералів. Поділіться посиланням, щоб запросити першого колегу.",
  details: "Деталі реферала", percent: "Відсоток винагороди", rewardPeriod: "Період винагороди", remainingEligibility: "Залишок періоду", history: "Історія нарахувань", noHistory: "Нарахувань ще немає", days: "дн.",
  entry: { commission: "Нарахування", reversal: "Повернення коштів", subscription_credit: "Покриття підписки", adjustment: "Коригування" } as Record<string, string>,
  payouts: "Історія виплат", requestPayout: "Замовити виплату", noPayouts: "Виплат ще не було.",
  colAmount: "Сума", colMethod: "Спосіб",
  payoutStatus: { pending: "Очікує підтвердження", processing: "В обробці", paid: "Виплачено", rejected: "Відхилено", cancelled: "Скасовано" } as Record<string, string>,
  method: { bank_card: "На банківську картку", iban: "IBAN", paypal: "PayPal" } as Record<string, string>,
  available: "Доступно", amount: "Сума", details2: "Реквізити (номер картки, IBAN або email PayPal)", submit: "Надіслати запит", cancel: "Скасувати", cancelRequest: "Скасувати запит",
  minPayout: (v: string) => `Мінімальна сума виплати — ${v}.`, payoutCreated: "Запит на виплату створено. Кошти зарезервовано до перевірки.",
  payoutNote: "Виплату підтверджує фінансовий адміністратор вручну. Статус «Виплачено» з’являється лише після фактичного переказу.",
  how: "Як це працює",
  steps: [
    ["Поділіться посиланням", "Скопіюйте своє персональне посилання та надішліть його колегам."],
    ["Колега реєструється", "Новий користувач переходить за вашим посиланням і створює акаунт у Solo .Bizz."],
    ["Система прив'язує реферала", "Після реєстрації система автоматично зберігає зв'язок між вашим акаунтом і запрошеним користувачем."],
    ["Ви отримуєте % від підписки", "Отримуйте відсоток від кожної оплаченої підписки протягом періоду винагороди."],
  ] as [string, string][],
  error: "Не вдалося завантажити дані.", retry: "Спробувати ще", errors: {
    insufficient_balance: "Сума перевищує доступний баланс.", below_minimum: "Сума менша за мінімальну.", invalid_amount: "Некоректна сума.", invalid_details: "Вкажіть реквізити.", invalid_method: "Оберіть спосіб.",
  } as Record<string, string>,
};
export type ReferralCopy = typeof uk;

const en: ReferralCopy = {
  ...uk,
  title: "Referral program", subtitle: "Invite colleagues and earn rewards from their subscriptions.",
  invited: "Invited", invitedTip: "Unique users who signed up with your link.", active: "Active referrals", activeTip: "Invited users with an active paid subscription.",
  earned: "Earned", earnedTip: "All confirmed rewards minus refunds.", withdrawable: "Available to withdraw", withdrawableTip: "What remains after covering your subscription, reserves and earlier payouts.",
  toCover: "Left to cover license", toCoverTip: "Amount still needed to cover your subscription this period.",
  rules: (p, m) => `Earn ${p}% of every successfully paid subscription of an invited user for ${m} months. Rewards first cover your own Solo .Bizz subscription. The surplus can be withdrawn.`,
  rulesLead: "How rewards work:", myLink: "My referral link", copy: "Copy", copied: "Link copied", invite: "Invite a friend", share: "Share:",
  inviteTitle: "Invite a friend", inviteText: (url) => `Hi! I run my practice in Solo .Bizz — calendar, clients and payments in one place. Try it free with my link: ${url}`,
  copyMessage: "Copy message", messageCopied: "Message copied",
  coverage: "Own license coverage", tariff: "Plan", perPeriod: { monthly: "mo", quarterly: "quarter", yearly: "yr" },
  covered: (a, b) => `Covered ${a} of ${b}`, remaining: "Left to cover", fullyCovered: "Your subscription is covered by referral rewards.",
  surplus: "Available to withdraw", noEarnings: "Invite colleagues to start covering your subscription.",
  noSubscription: "You have no active paid subscription — all rewards are available to withdraw.", coverageNote: "Payouts become available once rewards exceed your subscription.",
  referrals: "My referrals", search: "Search by name", allStatuses: "All statuses",
  colUser: "User", colDate: "Signed up", colStatus: "Status", colPlan: "Plan", colEarned: "Earned", colPeriod: "Reward period", sortDate: "By date", sortEarned: "By earnings",
  status: { registered: "Registered", awaiting_payment: "Awaiting first payment", active: "Active subscription", paused: "Paused subscription", canceled: "Cancelled subscription", reward_ended: "Reward period ended" },
  noReferrals: "No referrals yet. Share your link to invite your first colleague.",
  details: "Referral details", percent: "Reward percentage", rewardPeriod: "Reward period", remainingEligibility: "Remaining period", history: "Reward history", noHistory: "No rewards yet", days: "days",
  entry: { commission: "Commission", reversal: "Refund reversal", subscription_credit: "Subscription coverage", adjustment: "Adjustment" },
  payouts: "Payout history", requestPayout: "Request payout", noPayouts: "No payouts yet.", colAmount: "Amount", colMethod: "Method",
  payoutStatus: { pending: "Awaiting approval", processing: "Processing", paid: "Paid", rejected: "Rejected", cancelled: "Cancelled" },
  method: { bank_card: "To bank card", iban: "IBAN", paypal: "PayPal" },
  available: "Available", amount: "Amount", details2: "Payout details (card number, IBAN or PayPal email)", submit: "Send request", cancel: "Cancel", cancelRequest: "Cancel request",
  minPayout: (v) => `Minimum payout is ${v}.`, payoutCreated: "Payout requested. Funds are reserved until review.",
  payoutNote: "A finance administrator approves payouts manually. “Paid” appears only after the actual transfer.",
  how: "How it works",
  steps: [
    ["Share your link", "Copy your personal link and send it to colleagues."],
    ["A colleague signs up", "They follow your link and create a Solo .Bizz account."],
    ["The referral is linked", "After sign-up the system saves the link between your accounts."],
    ["You earn % of the subscription", "Earn a share of every paid subscription during the reward period."],
  ],
  error: "Couldn't load data.", retry: "Try again",
  errors: { insufficient_balance: "Amount exceeds available balance.", below_minimum: "Amount is below the minimum.", invalid_amount: "Invalid amount.", invalid_details: "Enter payout details.", invalid_method: "Choose a method." },
};

const ru: ReferralCopy = {
  ...uk,
  title: "Реферальная программа", subtitle: "Приглашайте коллег и получайте вознаграждение за их подписки.",
  invited: "Приглашено", active: "Активных рефералов", earned: "Начислено", withdrawable: "Доступно к выводу", toCover: "До покрытия лицензии",
  rules: (p, m) => `Получайте ${p}% от каждой успешно оплаченной подписки приглашённого пользователя в течение ${m} мес. Начисления сначала покрывают стоимость вашей подписки Solo .Bizz. Излишек можно вывести.`,
  rulesLead: "Как работает вознаграждение:", myLink: "Моя реферальная ссылка", copy: "Копировать", copied: "Ссылка скопирована", invite: "Пригласить друга", share: "Поделиться:",
  coverage: "Покрытие собственной лицензии", covered: (a, b) => `Покрыто ${a} из ${b}`, remaining: "Осталось покрыть",
  referrals: "Мои рефералы", payouts: "История выплат", requestPayout: "Заказать выплату", how: "Как это работает",
  status: { registered: "Зарегистрирован", awaiting_payment: "Ожидает первой оплаты", active: "Активная подписка", paused: "Приостановленная подписка", canceled: "Отменённая подписка", reward_ended: "Период вознаграждения завершён" },
  payoutStatus: { pending: "Ожидает подтверждения", processing: "В обработке", paid: "Выплачено", rejected: "Отклонено", cancelled: "Отменено" },
};

const pl: ReferralCopy = {
  ...en,
  title: "Program poleceń", subtitle: "Zapraszaj kolegów i otrzymuj nagrody za ich subskrypcje.",
  invited: "Zaproszeni", active: "Aktywni poleceni", earned: "Naliczono", withdrawable: "Do wypłaty", toCover: "Do pokrycia licencji",
  rules: (p, m) => `Otrzymuj ${p}% od każdej opłaconej subskrypcji zaproszonej osoby przez ${m} mies. Nagrody najpierw pokrywają Twoją subskrypcję Solo .Bizz. Nadwyżkę można wypłacić.`,
  myLink: "Mój link polecający", copy: "Kopiuj", copied: "Link skopiowany", invite: "Zaproś znajomego", share: "Udostępnij:",
  coverage: "Pokrycie własnej licencji", referrals: "Moi poleceni", payouts: "Historia wypłat", requestPayout: "Zamów wypłatę", how: "Jak to działa",
};

const fr: ReferralCopy = {
  ...en,
  title: "Programme de parrainage", subtitle: "Invitez vos collègues et soyez récompensé pour leurs abonnements.",
  invited: "Invités", active: "Filleuls actifs", earned: "Gagné", withdrawable: "Disponible au retrait", toCover: "Reste à couvrir",
  rules: (p, m) => `Recevez ${p}% de chaque abonnement payé par un filleul pendant ${m} mois. Les gains couvrent d'abord votre abonnement Solo .Bizz. Le surplus peut être retiré.`,
  myLink: "Mon lien de parrainage", copy: "Copier", copied: "Lien copié", invite: "Inviter un ami", share: "Partager :",
  coverage: "Couverture de votre licence", referrals: "Mes filleuls", payouts: "Historique des paiements", requestPayout: "Demander un paiement", how: "Comment ça marche",
};

export const referralCopy: Record<AppLanguage, ReferralCopy> = { uk, en, ru, pl, fr };
