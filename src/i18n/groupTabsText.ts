import type { AppLanguage } from "@/i18n/translations";

const en = { overview: "Overview", applications: "Applications", participants: "Participants", form: "Form configuration", analytics: "Analytics", about: "About the group", actions: "Group actions", regular: "Regular group" };
type Dict = typeof en;
const DICTS: Record<AppLanguage, Dict> = {
  en,
  uk: { overview: "Огляд", applications: "Заявки", participants: "Учасники", form: "Конфігурація форми", analytics: "Аналітика", about: "Про групу", actions: "Дії з групою", regular: "Регулярна група" },
  ru: { overview: "Обзор", applications: "Заявки", participants: "Участники", form: "Настройка формы", analytics: "Аналитика", about: "О группе", actions: "Действия с группой", regular: "Регулярная группа" },
  pl: { overview: "Przegląd", applications: "Zgłoszenia", participants: "Uczestnicy", form: "Konfiguracja formularza", analytics: "Analityka", about: "O grupie", actions: "Działania grupy", regular: "Grupa regularna" },
  de: { overview: "Übersicht", applications: "Anmeldungen", participants: "Teilnehmende", form: "Formular", analytics: "Analytik", about: "Über die Gruppe", actions: "Gruppenaktionen", regular: "Regelmäßige Gruppe" },
  fr: { overview: "Aperçu", applications: "Candidatures", participants: "Participants", form: "Configuration du formulaire", analytics: "Statistiques", about: "À propos du groupe", actions: "Actions du groupe", regular: "Groupe régulier" },
};
export const groupTabsText = (lang: string): Dict => DICTS[lang as AppLanguage] ?? en;
