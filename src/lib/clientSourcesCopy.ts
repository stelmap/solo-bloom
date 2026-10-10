import { useLanguage } from "@/i18n/LanguageContext";

type L = "en" | "uk" | "ru" | "pl" | "fr";
type Entry = Record<L, string>;

const C = {
  title: { en: "Client sources", uk: "Джерела клієнтів", ru: "Источники клиентов", pl: "Źródła klientów", fr: "Sources de clients" },
  subtitle: { en: "Where your clients come from and which channels pay off.", uk: "Звідки приходять клієнти та які канали окупаються.", ru: "Откуда приходят клиенты и какие каналы окупаются.", pl: "Skąd przychodzą klienci i które kanały się opłacają.", fr: "D'où viennent vos clients et quels canaux sont rentables." },
  add: { en: "Add source", uk: "Додати джерело", ru: "Добавить источник", pl: "Dodaj źródło", fr: "Ajouter une source" },
  createNew: { en: "Create new source", uk: "Створити нове джерело", ru: "Создать новый источник", pl: "Utwórz nowe źródło", fr: "Créer une source" },
  edit: { en: "Edit source", uk: "Редагувати джерело", ru: "Редактировать источник", pl: "Edytuj źródło", fr: "Modifier la source" },
  name: { en: "Source name", uk: "Назва джерела", ru: "Название источника", pl: "Nazwa źródła", fr: "Nom de la source" },
  type: { en: "Source type", uk: "Тип джерела", ru: "Тип источника", pl: "Typ źródła", fr: "Type de source" },
  description: { en: "Description", uk: "Опис", ru: "Описание", pl: "Opis", fr: "Description" },
  active: { en: "Active", uk: "Активне", ru: "Активный", pl: "Aktywne", fr: "Active" },
  inactive: { en: "Inactive", uk: "Неактивне", ru: "Неактивный", pl: "Nieaktywne", fr: "Inactive" },
  inactiveHint: { en: "Inactive sources stay in history but are hidden when adding new clients.", uk: "Неактивні джерела залишаються в історії, але не показуються при створенні нового клієнта.", ru: "Неактивные источники остаются в истории, но не показываются при создании клиента.", pl: "Nieaktywne źródła zostają w historii, ale nie są pokazywane przy dodawaniu klienta.", fr: "Les sources inactives restent dans l'historique mais sont masquées pour les nouveaux clients." },
  source: { en: "Source", uk: "Джерело", ru: "Источник", pl: "Źródło", fr: "Source" },
  clientSource: { en: "Client source", uk: "Джерело клієнта", ru: "Источник клиента", pl: "Źródło klienta", fr: "Source du client" },
  acquisition: { en: "Acquisition", uk: "Залучення", ru: "Привлечение", pl: "Pozyskanie", fr: "Acquisition" },
  expenseLink: { en: "Linked to client acquisition", uk: "Пов'язано із залученням клієнтів", ru: "Связано с привлечением клиентов", pl: "Powiązane z pozyskiwaniem klientów", fr: "Lié à l'acquisition de clients" },
  campaign: { en: "Campaign", uk: "Кампанія", ru: "Кампания", pl: "Kampania", fr: "Campagne" },
  campaigns: { en: "Campaigns", uk: "Кампанії", ru: "Кампании", pl: "Kampanie", fr: "Campagnes" },
  addCampaign: { en: "Add campaign", uk: "Додати кампанію", ru: "Добавить кампанию", pl: "Dodaj kampanię", fr: "Ajouter une campagne" },
  campaignName: { en: "Campaign name", uk: "Назва кампанії", ru: "Название кампании", pl: "Nazwa kampanii", fr: "Nom de la campagne" },
  startDate: { en: "Start date", uk: "Дата початку", ru: "Дата начала", pl: "Data rozpoczęcia", fr: "Date de début" },
  endDate: { en: "End date", uk: "Дата завершення", ru: "Дата окончания", pl: "Data zakończenia", fr: "Date de fin" },
  status: { en: "Status", uk: "Статус", ru: "Статус", pl: "Status", fr: "Statut" },
  notes: { en: "Notes", uk: "Примітки", ru: "Заметки", pl: "Notatki", fr: "Notes" },
  st_planned: { en: "Planned", uk: "Запланована", ru: "Запланирована", pl: "Planowana", fr: "Prévue" },
  st_active: { en: "Active", uk: "Активна", ru: "Активна", pl: "Aktywna", fr: "Active" },
  st_finished: { en: "Finished", uk: "Завершена", ru: "Завершена", pl: "Zakończona", fr: "Terminée" },
  none: { en: "Not specified", uk: "Не вказано", ru: "Не указано", pl: "Nie podano", fr: "Non précisé" },
  noCampaign: { en: "No campaign", uk: "Без кампанії", ru: "Без кампании", pl: "Bez kampanii", fr: "Sans campagne" },
  referredBy: { en: "Who referred?", uk: "Хто рекомендував?", ru: "Кто порекомендовал?", pl: "Kto polecił?", fr: "Qui a recommandé ?" },
  referrerClient: { en: "Existing client", uk: "Існуючий клієнт", ru: "Существующий клиент", pl: "Istniejący klient", fr: "Client existant" },
  referrerOther: { en: "Or type a name (colleague, partner…)", uk: "Або введіть ім'я (колега, партнер…)", ru: "Или введите имя (коллега, партнёр…)", pl: "Lub wpisz imię (kolega, partner…)", fr: "Ou saisissez un nom (collègue, partenaire…)" },
  clients: { en: "Clients", uk: "Клієнтів", ru: "Клиентов", pl: "Klientów", fr: "Clients" },
  newClients: { en: "New clients", uk: "Нові клієнти", ru: "Новые клиенты", pl: "Nowi klienci", fr: "Nouveaux clients" },
  expenses: { en: "Expenses", uk: "Витрати", ru: "Расходы", pl: "Wydatki", fr: "Dépenses" },
  revenue: { en: "Revenue", uk: "Дохід", ru: "Доход", pl: "Przychód", fr: "Revenus" },
  cac: { en: "CAC", uk: "CAC", ru: "CAC", pl: "CAC", fr: "CAC" },
  roi: { en: "Revenue / cost", uk: "Дохід / витрати", ru: "Доход / расходы", pl: "Przychód / koszt", fr: "Revenus / coût" },
  efficiency: { en: "Efficiency", uk: "Ефективність", ru: "Эффективность", pl: "Efektywność", fr: "Efficacité" },
  eff_high: { en: "High", uk: "Висока", ru: "Высокая", pl: "Wysoka", fr: "Élevée" },
  eff_medium: { en: "Medium", uk: "Середня", ru: "Средняя", pl: "Średnia", fr: "Moyenne" },
  eff_low: { en: "Low", uk: "Низька", ru: "Низкая", pl: "Niska", fr: "Faible" },
  eff_none: { en: "—", uk: "—", ru: "—", pl: "—", fr: "—" },
  share: { en: "Share", uk: "Частка", ru: "Доля", pl: "Udział", fr: "Part" },
  whereFrom: { en: "Where clients come from", uk: "Звідки приходять клієнти", ru: "Откуда приходят клиенты", pl: "Skąd przychodzą klienci", fr: "D'où viennent les clients" },
  acqEfficiency: { en: "Client acquisition efficiency", uk: "Ефективність залучення клієнтів", ru: "Эффективность привлечения клиентов", pl: "Efektywność pozyskiwania klientów", fr: "Efficacité de l'acquisition de clients" },
  openSources: { en: "Manage sources", uk: "Керувати джерелами", ru: "Управлять источниками", pl: "Zarządzaj źródłami", fr: "Gérer les sources" },
  empty: { en: "No sources yet. Add Instagram, referrals or your website to start tracking.", uk: "Джерел ще немає. Додайте Instagram, рекомендації чи сайт, щоб почати відстеження.", ru: "Источников пока нет. Добавьте Instagram, рекомендации или сайт.", pl: "Brak źródeł. Dodaj Instagram, polecenia lub stronę, aby zacząć.", fr: "Aucune source. Ajoutez Instagram, recommandations ou votre site." },
  noData: { en: "No new clients in this period.", uk: "За цей період нових клієнтів немає.", ru: "За этот период новых клиентов нет.", pl: "Brak nowych klientów w tym okresie.", fr: "Aucun nouveau client sur cette période." },
  period: { en: "Period", uk: "Період", ru: "Период", pl: "Okres", fr: "Période" },
  p_this_month: { en: "This month", uk: "Цей місяць", ru: "Этот месяц", pl: "Ten miesiąc", fr: "Ce mois-ci" },
  p_last_month: { en: "Last month", uk: "Минулий місяць", ru: "Прошлый месяц", pl: "Poprzedni miesiąc", fr: "Mois dernier" },
  p_last_3m: { en: "Last 3 months", uk: "Останні 3 місяці", ru: "Последние 3 месяца", pl: "Ostatnie 3 miesiące", fr: "3 derniers mois" },
  p_last_6m: { en: "Last 6 months", uk: "Останні 6 місяців", ru: "Последние 6 месяцев", pl: "Ostatnie 6 miesięcy", fr: "6 derniers mois" },
  p_this_year: { en: "This year", uk: "Цей рік", ru: "Этот год", pl: "Ten rok", fr: "Cette année" },
  p_all: { en: "All time", uk: "Весь період", ru: "Весь период", pl: "Cały okres", fr: "Toute la période" },
  p_custom: { en: "Custom range", uk: "Свій період", ru: "Свой период", pl: "Własny zakres", fr: "Période personnalisée" },
  summary: { en: "Summary", uk: "Підсумок", ru: "Итог", pl: "Podsumowanie", fr: "Résumé" },
  date: { en: "Date", uk: "Дата", ru: "Дата", pl: "Data", fr: "Date" },
  meetings: { en: "Meetings", uk: "Зустрічей", ru: "Встреч", pl: "Spotkań", fr: "Rendez-vous" },
  referrers: { en: "Top referrers", uk: "Хто рекомендує найбільше", ru: "Кто рекомендует больше всего", pl: "Najczęściej polecający", fr: "Meilleurs prescripteurs" },
  referredN: { en: "referred {n}", uk: "рекомендував(-ла) {n}", ru: "порекомендовал(а) {n}", pl: "polecił(a) {n}", fr: "a recommandé {n}" },
  save: { en: "Save", uk: "Зберегти", ru: "Сохранить", pl: "Zapisz", fr: "Enregistrer" },
  cancel: { en: "Cancel", uk: "Скасувати", ru: "Отмена", pl: "Anuluj", fr: "Annuler" },
  delete: { en: "Delete", uk: "Видалити", ru: "Удалить", pl: "Usuń", fr: "Supprimer" },
  deleteConfirm: { en: "Delete this source? Clients and expenses stay, but lose the link.", uk: "Видалити джерело? Клієнти й витрати залишаться, але без прив'язки.", ru: "Удалить источник? Клиенты и расходы останутся без привязки.", pl: "Usunąć źródło? Klienci i wydatki zostaną, ale bez powiązania.", fr: "Supprimer la source ? Clients et dépenses restent, sans lien." },
  back: { en: "All sources", uk: "Усі джерела", ru: "Все источники", pl: "Wszystkie źródła", fr: "Toutes les sources" },
  t_referral: { en: "Referral", uk: "Рекомендація", ru: "Рекомендация", pl: "Polecenie", fr: "Recommandation" },
  t_social: { en: "Social media", uk: "Соціальні мережі", ru: "Соцсети", pl: "Media społecznościowe", fr: "Réseaux sociaux" },
  t_paid_ads: { en: "Paid ads", uk: "Платна реклама", ru: "Платная реклама", pl: "Płatne reklamy", fr: "Publicité payante" },
  t_organic_search: { en: "Organic search", uk: "Органічний пошук", ru: "Органический поиск", pl: "Wyszukiwanie organiczne", fr: "Recherche organique" },
  t_website: { en: "Website", uk: "Сайт", ru: "Сайт", pl: "Strona", fr: "Site web" },
  t_event: { en: "Event / conference", uk: "Подія / конференція", ru: "Событие / конференция", pl: "Wydarzenie / konferencja", fr: "Événement / conférence" },
  t_partnership: { en: "Partnership", uk: "Партнерство", ru: "Партнёрство", pl: "Partnerstwo", fr: "Partenariat" },
  t_directory: { en: "Directory / platform", uk: "Каталог / платформа", ru: "Каталог / платформа", pl: "Katalog / platforma", fr: "Annuaire / plateforme" },
  t_other: { en: "Other", uk: "Інше", ru: "Другое", pl: "Inne", fr: "Autre" },
} satisfies Record<string, Entry>;

export type SourceCopyKey = keyof typeof C;

export function useSourceCopy() {
  const { lang } = useLanguage();
  const l: L = (["en", "uk", "ru", "pl", "fr"] as const).includes(lang as L) ? (lang as L) : "en";
  return (k: SourceCopyKey, vars?: Record<string, string | number>) => {
    let s = C[k][l];
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, String(b));
    return s;
  };
}
