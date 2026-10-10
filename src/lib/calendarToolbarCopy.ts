/** Copy for the redesigned Calendar toolbar, booking-link strip and View & filters panel. */
export type CalToolbarCopy = {
  title: string; unpaid: string; requests: string; newRecord: string;
  linkTitle: string; linkHint: string; copy: string; copied: string; view: string; linkMissing: string; linkSetup: string;
  viewFilters: string; viewGroup: string; density: string; densityNormal: string; densityCompact: string;
  grid: string; gridFit: string; gridScroll: string; highlight: string; highlightHint: string;
  filtersGroup: string; client: string; allClients: string; status: string; allStatuses: string;
  payment: string; allPayments: string; payPaid: string; payAwaiting: string; payUnpaid: string;
  reset: string; autosave: string; settings: string; activeFilters: (n: number) => string; close: string;
  stScheduled: string; stConfirmed: string; stCompleted: string; stCancelled: string; stNoShow: string;
  unpaidTitle: string; unpaidHint: string; unpaidEmpty: string; price: string; paid: string; left: string; addPayment: string;
  help: string;
};

const uk: CalToolbarCopy = {
  title: "Календар", unpaid: "Неоплачені", requests: "Запити на запис", newRecord: "Новий запис",
  linkTitle: "Посилання для запису клієнтів", linkHint: "Надішліть клієнту, щоб він обрав час", copy: "Копіювати", copied: "Посилання скопійовано", view: "Переглянути", linkMissing: "Посилання ще не створено", linkSetup: "Налаштувати",
  viewFilters: "Вигляд і фільтри", viewGroup: "Вигляд", density: "Щільність записів", densityNormal: "Звичайна", densityCompact: "Компактна",
  grid: "Сітка календаря", gridFit: "Вмістити", gridScroll: "Прокручування", highlight: "Підсвічувати час поза онлайн-записом", highlightHint: "Змінює лише підсвічування — зустрічі залишаються видимими",
  filtersGroup: "Фільтри", client: "Клієнт", allClients: "Усі клієнти", status: "Статус зустрічі", allStatuses: "Усі статуси",
  payment: "Оплата", allPayments: "Усі", payPaid: "Оплачено", payAwaiting: "Очікує оплати", payUnpaid: "Не оплачено",
  reset: "Скинути фільтри", autosave: "Зміни зберігаються автоматично", settings: "Налаштування календаря", activeFilters: (n) => `Активних фільтрів: ${n}`, close: "Закрити",
  stScheduled: "Заплановано", stConfirmed: "Підтверджено", stCompleted: "Завершено", stCancelled: "Скасовано", stNoShow: "Неявка",
  unpaidTitle: "Неоплачені зустрічі", unpaidHint: "Завершені зустрічі, за які залишилася сума до сплати", unpaidEmpty: "Немає неоплачених зустрічей", price: "Вартість", paid: "Сплачено", left: "Залишок", addPayment: "Внести оплату",
  help: "Допомога",
};
const ru: CalToolbarCopy = {
  title: "Календарь", unpaid: "Неоплаченные", requests: "Запросы на запись", newRecord: "Новая запись",
  linkTitle: "Ссылка для записи клиентов", linkHint: "Отправьте клиенту, чтобы он выбрал время", copy: "Копировать", copied: "Ссылка скопирована", view: "Просмотреть", linkMissing: "Ссылка ещё не создана", linkSetup: "Настроить",
  viewFilters: "Вид и фильтры", viewGroup: "Вид", density: "Плотность записей", densityNormal: "Обычная", densityCompact: "Компактная",
  grid: "Сетка календаря", gridFit: "Вместить", gridScroll: "Прокрутка", highlight: "Подсвечивать время вне онлайн-записи", highlightHint: "Меняет только подсветку — встречи остаются видимыми",
  filtersGroup: "Фильтры", client: "Клиент", allClients: "Все клиенты", status: "Статус встречи", allStatuses: "Все статусы",
  payment: "Оплата", allPayments: "Все", payPaid: "Оплачено", payAwaiting: "Ожидает оплаты", payUnpaid: "Не оплачено",
  reset: "Сбросить фильтры", autosave: "Изменения сохраняются автоматически", settings: "Настройки календаря", activeFilters: (n) => `Активных фильтров: ${n}`, close: "Закрыть",
  stScheduled: "Запланировано", stConfirmed: "Подтверждено", stCompleted: "Завершено", stCancelled: "Отменено", stNoShow: "Неявка",
  unpaidTitle: "Неоплаченные встречи", unpaidHint: "Завершённые встречи с остатком к оплате", unpaidEmpty: "Нет неоплаченных встреч", price: "Стоимость", paid: "Оплачено", left: "Остаток", addPayment: "Внести оплату",
  help: "Помощь",
};
const en: CalToolbarCopy = {
  title: "Calendar", unpaid: "Unpaid", requests: "Booking requests", newRecord: "New appointment",
  linkTitle: "Client booking link", linkHint: "Send it to a client so they can pick a time", copy: "Copy", copied: "Link copied", view: "Preview", linkMissing: "No booking link yet", linkSetup: "Set up",
  viewFilters: "View & filters", viewGroup: "View", density: "Appointment density", densityNormal: "Normal", densityCompact: "Compact",
  grid: "Calendar grid", gridFit: "Fit", gridScroll: "Scroll", highlight: "Highlight time outside online booking", highlightHint: "Only changes shading — meetings stay visible",
  filtersGroup: "Filters", client: "Client", allClients: "All clients", status: "Meeting status", allStatuses: "All statuses",
  payment: "Payment", allPayments: "All", payPaid: "Paid", payAwaiting: "Awaiting payment", payUnpaid: "Unpaid",
  reset: "Reset filters", autosave: "Changes are saved automatically", settings: "Calendar settings", activeFilters: (n) => `${n} active ${n === 1 ? "filter" : "filters"}`, close: "Close",
  stScheduled: "Scheduled", stConfirmed: "Confirmed", stCompleted: "Completed", stCancelled: "Cancelled", stNoShow: "No-show",
  unpaidTitle: "Unpaid meetings", unpaidHint: "Completed meetings with an amount still due", unpaidEmpty: "No unpaid meetings", price: "Price", paid: "Paid", left: "Remaining", addPayment: "Record payment",
  help: "Help",
};
const pl: CalToolbarCopy = {
  title: "Kalendarz", unpaid: "Nieopłacone", requests: "Prośby o rezerwację", newRecord: "Nowy termin",
  linkTitle: "Link do rezerwacji dla klientów", linkHint: "Wyślij klientowi, aby wybrał termin", copy: "Kopiuj", copied: "Link skopiowany", view: "Podgląd", linkMissing: "Link nie został jeszcze utworzony", linkSetup: "Skonfiguruj",
  viewFilters: "Widok i filtry", viewGroup: "Widok", density: "Gęstość wpisów", densityNormal: "Normalna", densityCompact: "Kompaktowa",
  grid: "Siatka kalendarza", gridFit: "Dopasuj", gridScroll: "Przewijanie", highlight: "Podświetlaj czas poza rezerwacją online", highlightHint: "Zmienia tylko podświetlenie — spotkania pozostają widoczne",
  filtersGroup: "Filtry", client: "Klient", allClients: "Wszyscy klienci", status: "Status spotkania", allStatuses: "Wszystkie statusy",
  payment: "Płatność", allPayments: "Wszystkie", payPaid: "Opłacone", payAwaiting: "Oczekuje na płatność", payUnpaid: "Nieopłacone",
  reset: "Wyczyść filtry", autosave: "Zmiany zapisują się automatycznie", settings: "Ustawienia kalendarza", activeFilters: (n) => `Aktywne filtry: ${n}`, close: "Zamknij",
  stScheduled: "Zaplanowane", stConfirmed: "Potwierdzone", stCompleted: "Zakończone", stCancelled: "Anulowane", stNoShow: "Nieobecność",
  unpaidTitle: "Nieopłacone spotkania", unpaidHint: "Zakończone spotkania z kwotą do zapłaty", unpaidEmpty: "Brak nieopłaconych spotkań", price: "Cena", paid: "Zapłacono", left: "Pozostało", addPayment: "Dodaj płatność",
  help: "Pomoc",
};
const fr: CalToolbarCopy = {
  title: "Calendrier", unpaid: "Impayés", requests: "Demandes de rendez-vous", newRecord: "Nouveau rendez-vous",
  linkTitle: "Lien de réservation clients", linkHint: "Envoyez-le à un client pour qu'il choisisse un horaire", copy: "Copier", copied: "Lien copié", view: "Aperçu", linkMissing: "Aucun lien de réservation", linkSetup: "Configurer",
  viewFilters: "Affichage et filtres", viewGroup: "Affichage", density: "Densité des rendez-vous", densityNormal: "Normale", densityCompact: "Compacte",
  grid: "Grille du calendrier", gridFit: "Ajuster", gridScroll: "Défilement", highlight: "Surligner les heures hors réservation en ligne", highlightHint: "Modifie uniquement le surlignage — les rendez-vous restent visibles",
  filtersGroup: "Filtres", client: "Client", allClients: "Tous les clients", status: "Statut du rendez-vous", allStatuses: "Tous les statuts",
  payment: "Paiement", allPayments: "Tous", payPaid: "Payé", payAwaiting: "En attente de paiement", payUnpaid: "Impayé",
  reset: "Réinitialiser les filtres", autosave: "Les modifications sont enregistrées automatiquement", settings: "Paramètres du calendrier", activeFilters: (n) => `${n} filtre${n > 1 ? "s" : ""} actif${n > 1 ? "s" : ""}`, close: "Fermer",
  stScheduled: "Planifié", stConfirmed: "Confirmé", stCompleted: "Terminé", stCancelled: "Annulé", stNoShow: "Absence",
  unpaidTitle: "Rendez-vous impayés", unpaidHint: "Rendez-vous terminés avec un montant restant dû", unpaidEmpty: "Aucun rendez-vous impayé", price: "Prix", paid: "Payé", left: "Reste", addPayment: "Enregistrer un paiement",
  help: "Aide",
};

const ALL: Record<string, CalToolbarCopy> = { uk, ru, en, pl, fr };
export const calToolbarCopy = (lang: string): CalToolbarCopy => ALL[lang] ?? en;
