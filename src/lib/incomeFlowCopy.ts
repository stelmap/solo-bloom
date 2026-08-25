/**
 * Copy for the simplified "Add income" → "Link payment to sessions" flow.
 * Kept local to the flow (like the practice profile page) so the two-step
 * wizard can ship consistent wording in all supported languages.
 */
export type IncomeFlowLang = "en" | "uk" | "ru" | "fr" | "pl";

export const normIncomeLang = (v: unknown): IncomeFlowLang => {
  const s = String(v || "en").toLowerCase();
  return (["en", "uk", "ru", "fr", "pl"].includes(s) ? s : "en") as IncomeFlowLang;
};

export interface IncomeFlowCopy {
  selectOrSearch: string;
  searchClients: string;
  noClients: string;
  continue: string;
  linkTitle: string;
  amountLabel: string;
  paymentDate: string;
  edit: string;
  searchSessions: string;
  sort: string;
  sortOldest: string;
  sortNewest: string;
  sortLowest: string;
  sortHighest: string;
  autoAllocate: string;
  colDateTime: string;
  colService: string;
  colPrice: string;
  colPaid: string;
  colRemaining: string;
  colAllocate: string;
  noSessions: string;
  received: string;
  allocated: string;
  unallocated: string;
  back: string;
  saveIncome: string;
  saving: string;
  overAllocated: string;
  prepayment: string;
}

export const INCOME_FLOW_COPY: Record<IncomeFlowLang, IncomeFlowCopy> = {
  en: {
    selectOrSearch: "Search or select a client",
    searchClients: "Search clients",
    noClients: "No clients found",
    continue: "Continue",
    linkTitle: "Link payment to sessions",
    amountLabel: "Amount",
    paymentDate: "Payment date",
    edit: "Edit",
    searchSessions: "Search sessions",
    sort: "Sort",
    sortOldest: "Oldest first",
    sortNewest: "Newest first",
    sortLowest: "Lowest remaining",
    sortHighest: "Highest remaining",
    autoAllocate: "Auto-allocate",
    colDateTime: "Date & time",
    colService: "Service",
    colPrice: "Price",
    colPaid: "Paid",
    colRemaining: "Remaining",
    colAllocate: "Allocate",
    noSessions: "No sessions with an outstanding balance",
    received: "Payment received",
    allocated: "Allocated",
    unallocated: "Unallocated",
    back: "Back",
    saveIncome: "Save income",
    saving: "Saving…",
    overAllocated: "Allocated amount exceeds the payment",
    prepayment: "will be saved as client prepayment",
  },
  uk: {
    selectOrSearch: "Знайдіть або оберіть клієнта",
    searchClients: "Пошук клієнтів",
    noClients: "Клієнтів не знайдено",
    continue: "Продовжити",
    linkTitle: "Прив'язати оплату до сесій",
    amountLabel: "Сума",
    paymentDate: "Дата оплати",
    edit: "Змінити",
    searchSessions: "Пошук сесій",
    sort: "Сортування",
    sortOldest: "Спочатку старіші",
    sortNewest: "Спочатку новіші",
    sortLowest: "Найменший залишок",
    sortHighest: "Найбільший залишок",
    autoAllocate: "Розподілити автоматично",
    colDateTime: "Дата і час",
    colService: "Послуга",
    colPrice: "Ціна",
    colPaid: "Сплачено",
    colRemaining: "Залишок",
    colAllocate: "Розподіл",
    noSessions: "Немає сесій із заборгованістю",
    received: "Отримано",
    allocated: "Розподілено",
    unallocated: "Нерозподілено",
    back: "Назад",
    saveIncome: "Зберегти дохід",
    saving: "Збереження…",
    overAllocated: "Розподілена сума перевищує оплату",
    prepayment: "буде збережено як передоплату клієнта",
  },
  ru: {
    selectOrSearch: "Найдите или выберите клиента",
    searchClients: "Поиск клиентов",
    noClients: "Клиенты не найдены",
    continue: "Продолжить",
    linkTitle: "Привязать оплату к сессиям",
    amountLabel: "Сумма",
    paymentDate: "Дата оплаты",
    edit: "Изменить",
    searchSessions: "Поиск сессий",
    sort: "Сортировка",
    sortOldest: "Сначала старые",
    sortNewest: "Сначала новые",
    sortLowest: "Меньший остаток",
    sortHighest: "Больший остаток",
    autoAllocate: "Распределить автоматически",
    colDateTime: "Дата и время",
    colService: "Услуга",
    colPrice: "Цена",
    colPaid: "Оплачено",
    colRemaining: "Остаток",
    colAllocate: "Распределение",
    noSessions: "Нет сессий с задолженностью",
    received: "Получено",
    allocated: "Распределено",
    unallocated: "Нераспределено",
    back: "Назад",
    saveIncome: "Сохранить доход",
    saving: "Сохранение…",
    overAllocated: "Распределённая сумма превышает оплату",
    prepayment: "будет сохранено как предоплата клиента",
  },
  fr: {
    selectOrSearch: "Rechercher ou choisir un client",
    searchClients: "Rechercher des clients",
    noClients: "Aucun client trouvé",
    continue: "Continuer",
    linkTitle: "Associer le paiement aux séances",
    amountLabel: "Montant",
    paymentDate: "Date du paiement",
    edit: "Modifier",
    searchSessions: "Rechercher des séances",
    sort: "Tri",
    sortOldest: "Plus anciennes d'abord",
    sortNewest: "Plus récentes d'abord",
    sortLowest: "Reste le plus faible",
    sortHighest: "Reste le plus élevé",
    autoAllocate: "Répartition auto",
    colDateTime: "Date et heure",
    colService: "Prestation",
    colPrice: "Prix",
    colPaid: "Payé",
    colRemaining: "Reste",
    colAllocate: "Affecter",
    noSessions: "Aucune séance avec un solde à régler",
    received: "Paiement reçu",
    allocated: "Affecté",
    unallocated: "Non affecté",
    back: "Retour",
    saveIncome: "Enregistrer",
    saving: "Enregistrement…",
    overAllocated: "Le montant affecté dépasse le paiement",
    prepayment: "sera enregistré comme acompte du client",
  },
  pl: {
    selectOrSearch: "Wyszukaj lub wybierz klienta",
    searchClients: "Szukaj klientów",
    noClients: "Nie znaleziono klientów",
    continue: "Dalej",
    linkTitle: "Powiąż płatność z sesjami",
    amountLabel: "Kwota",
    paymentDate: "Data płatności",
    edit: "Edytuj",
    searchSessions: "Szukaj sesji",
    sort: "Sortowanie",
    sortOldest: "Najstarsze najpierw",
    sortNewest: "Najnowsze najpierw",
    sortLowest: "Najmniejsza pozostała kwota",
    sortHighest: "Największa pozostała kwota",
    autoAllocate: "Rozdziel automatycznie",
    colDateTime: "Data i godzina",
    colService: "Usługa",
    colPrice: "Cena",
    colPaid: "Zapłacono",
    colRemaining: "Pozostało",
    colAllocate: "Przydział",
    noSessions: "Brak sesji z nieuregulowanym saldem",
    received: "Otrzymana płatność",
    allocated: "Przydzielono",
    unallocated: "Nieprzydzielone",
    back: "Wstecz",
    saveIncome: "Zapisz przychód",
    saving: "Zapisywanie…",
    overAllocated: "Przydzielona kwota przekracza płatność",
    prepayment: "zostanie zapisane jako przedpłata klienta",
  },
};

/** Copy for the redesigned Income page header, summary tabs and filter bar. */
export interface IncomePageCopy {
  title: string;
  subtitle: string;
  export: string;
  addIncome: string;
  addIncomeHint: string;
  confirmedIncome: string;
  expectedPayments: string;
  searchClient: string;
  allClients: string;
  sortClientName: string;
  sortDateNewest: string;
  sortDateOldest: string;
  sortAmount: string;
  waiting: (n: number) => string;
  expectedFrom: (n: number) => string;
  recordPayment: string;
  noIncome: string;
  noPending: string;
}

export const INCOME_PAGE_COPY: Record<IncomeFlowLang, IncomePageCopy> = {
  en: {
    title: "Income",
    subtitle: "See what you've received and what clients still need to pay",
    export: "Export",
    addIncome: "Add income",
    addIncomeHint: "Use Add income for payments not linked to a session.",
    confirmedIncome: "Confirmed income",
    expectedPayments: "Expected payments",
    searchClient: "Search client",
    allClients: "All clients",
    sortClientName: "Client name",
    sortDateNewest: "Newest first",
    sortDateOldest: "Oldest first",
    sortAmount: "Amount",
    waiting: (n) => `${n} ${n === 1 ? "payment is" : "payments are"} waiting to be recorded`,
    expectedFrom: (n) => `Expected from ${n} ${n === 1 ? "client" : "clients"}`,
    recordPayment: "Record payment",
    noIncome: "No income for this period",
    noPending: "No expected payments",
  },
  uk: {
    title: "Дохід",
    subtitle: "Перегляньте, що отримано і що клієнти ще мають сплатити",
    export: "Експорт",
    addIncome: "Додати дохід",
    addIncomeHint: "Використовуйте «Додати дохід» для оплат, не пов'язаних із сесією.",
    confirmedIncome: "Підтверджений дохід",
    expectedPayments: "Очікувані оплати",
    searchClient: "Пошук клієнта",
    allClients: "Усі клієнти",
    sortClientName: "Ім'я клієнта",
    sortDateNewest: "Спочатку новіші",
    sortDateOldest: "Спочатку старіші",
    sortAmount: "Сума",
    waiting: (n) => `${n} оплат(и) очікують на внесення`,
    expectedFrom: (n) => `Очікується від ${n} клієнт(ів)`,
    recordPayment: "Внести оплату",
    noIncome: "Немає доходу за цей період",
    noPending: "Немає очікуваних оплат",
  },
  ru: {
    title: "Доход",
    subtitle: "Смотрите, что получено и что клиенты ещё должны оплатить",
    export: "Экспорт",
    addIncome: "Добавить доход",
    addIncomeHint: "Используйте «Добавить доход» для оплат, не связанных с сессией.",
    confirmedIncome: "Подтверждённый доход",
    expectedPayments: "Ожидаемые оплаты",
    searchClient: "Поиск клиента",
    allClients: "Все клиенты",
    sortClientName: "Имя клиента",
    sortDateNewest: "Сначала новые",
    sortDateOldest: "Сначала старые",
    sortAmount: "Сумма",
    waiting: (n) => `${n} оплат(ы) ожидают внесения`,
    expectedFrom: (n) => `Ожидается от ${n} клиент(ов)`,
    recordPayment: "Внести оплату",
    noIncome: "Нет дохода за этот период",
    noPending: "Нет ожидаемых оплат",
  },
  fr: {
    title: "Revenus",
    subtitle: "Voyez ce que vous avez reçu et ce que les clients doivent encore payer",
    export: "Exporter",
    addIncome: "Ajouter un revenu",
    addIncomeHint: "Utilisez « Ajouter un revenu » pour les paiements sans séance liée.",
    confirmedIncome: "Revenus confirmés",
    expectedPayments: "Paiements attendus",
    searchClient: "Rechercher un client",
    allClients: "Tous les clients",
    sortClientName: "Nom du client",
    sortDateNewest: "Plus récents d'abord",
    sortDateOldest: "Plus anciens d'abord",
    sortAmount: "Montant",
    waiting: (n) => `${n} paiement(s) en attente d'enregistrement`,
    expectedFrom: (n) => `Attendu de ${n} client(s)`,
    recordPayment: "Enregistrer le paiement",
    noIncome: "Aucun revenu pour cette période",
    noPending: "Aucun paiement attendu",
  },
  pl: {
    title: "Przychód",
    subtitle: "Zobacz, co otrzymano i co klienci muszą jeszcze zapłacić",
    export: "Eksport",
    addIncome: "Dodaj przychód",
    addIncomeHint: "Użyj „Dodaj przychód” dla płatności niepowiązanych z sesją.",
    confirmedIncome: "Potwierdzony przychód",
    expectedPayments: "Oczekiwane płatności",
    searchClient: "Szukaj klienta",
    allClients: "Wszyscy klienci",
    sortClientName: "Nazwa klienta",
    sortDateNewest: "Najnowsze najpierw",
    sortDateOldest: "Najstarsze najpierw",
    sortAmount: "Kwota",
    waiting: (n) => `${n} płatność/płatności czeka na zapisanie`,
    expectedFrom: (n) => `Oczekiwane od ${n} klient(ów)`,
    recordPayment: "Zapisz płatność",
    noIncome: "Brak przychodu w tym okresie",
    noPending: "Brak oczekiwanych płatności",
  },
};
