import type { AppLanguage } from "@/i18n/translations";

const en = {
  type: "Group type", regular: "Regular group", supervision: "Supervision group",
  instructions: "Instructions for participants", instructionsHint: "Sent in the confirmation email.",
  capacity: "Place limit", capacityHint: "Leave empty for no limit.", price: "Price per meeting",
  absencePolicy: "Missed meeting", chargeAbsent: "Charge for a missed held meeting", noChargeAbsent: "Do not charge for a missed meeting",
  publication: "Registration page", published: "Published", unpublished: "Not published",
  publishHint: "Anyone with the link can apply. Other participants are never shown.",
  publish: "Publish", unpublish: "Unpublish", copyLink: "Copy link", linkCopied: "Link copied",
  registrations: "Applications", noRegistrations: "No applications yet",
  pending: "New", confirmed: "Confirmed", rejected: "Rejected", waitlisted: "Waiting list", transferred: "Transferred",
  confirm: "Confirm", reject: "Reject", toWaitlist: "To waiting list", groupFull: "The group is full. Raise the limit or move the person to the waiting list.",
  transfer: "Move selected", transferTitle: "Move to another group", targetGroup: "Target group", newCopy: "New copy of this group", newName: "Name of new group", transferred_ok: "Applicants moved",
  copyGroup: "Copy group", copyOf: "copy", archive: "Archive", unarchive: "Restore", archived: "Archived",
  deleteDesc: "The group disappears from your list. Meetings, attendance, payments and applications stay saved.",
  sendMessage: "Message participants", subject: "Subject", message: "Message", materialLink: "Material link (https, optional)", send: "Send",
  sentCount: (n: number) => `Sent: ${n}`, emailDecision: "Notify by email",
  supActive: "Active work", supObserver: "Observer", supNA: "—",
  // public
  applyTitle: "Apply to join", yourName: "Your name", email: "Email", phone: "Phone (optional)", note: "Message (optional)", submit: "Send application",
  upcoming: "Upcoming meetings", full: "The group is full — you can join the waiting list.",
  doneTitle: "Thank you!", donePending: "Your application has been sent. The therapist will contact you by email.", doneWait: "You are on the waiting list. The therapist will contact you if a place opens.", doneDup: "You have already applied to this group.",
  unavailable: "This registration page is not available.", privacy: "Your details are seen only by the therapist.",
};
type Dict = typeof en;

const uk: Dict = {
  type: "Тип групи", regular: "Звичайна група", supervision: "Супервізійна група",
  instructions: "Інструкція для учасників", instructionsHint: "Надсилається в листі про підтвердження.",
  capacity: "Ліміт місць", capacityHint: "Залиште порожнім, якщо ліміту немає.", price: "Ціна за зустріч",
  absencePolicy: "Пропущена зустріч", chargeAbsent: "Оплачувати пропущену проведену зустріч", noChargeAbsent: "Не оплачувати пропущену зустріч",
  publication: "Сторінка реєстрації", published: "Опубліковано", unpublished: "Не опубліковано",
  publishHint: "Подати заявку може будь-хто з посиланням. Інших учасників не видно.",
  publish: "Опублікувати", unpublish: "Зняти з публікації", copyLink: "Копіювати посилання", linkCopied: "Посилання скопійовано",
  registrations: "Заявки", noRegistrations: "Заявок ще немає",
  pending: "Нова", confirmed: "Підтверджено", rejected: "Відхилено", waitlisted: "Список очікування", transferred: "Перенесено",
  confirm: "Підтвердити", reject: "Відхилити", toWaitlist: "У список очікування", groupFull: "Група заповнена. Збільште ліміт або перенесіть людину в список очікування.",
  transfer: "Перенести вибраних", transferTitle: "Перенести в іншу групу", targetGroup: "Цільова група", newCopy: "Нова копія цієї групи", newName: "Назва нової групи", transferred_ok: "Заявників перенесено",
  copyGroup: "Копіювати групу", copyOf: "копія", archive: "Архівувати", unarchive: "Відновити", archived: "В архіві",
  deleteDesc: "Група зникне зі списку. Зустрічі, відвідуваність, оплати й заявки залишаться збереженими.",
  sendMessage: "Написати учасникам", subject: "Тема", message: "Повідомлення", materialLink: "Посилання на матеріал (https, необов'язково)", send: "Надіслати",
  sentCount: n => `Надіслано: ${n}`, emailDecision: "Повідомити листом",
  supActive: "Активна робота", supObserver: "Спостерігач", supNA: "—",
  applyTitle: "Подати заявку", yourName: "Ваше ім'я", email: "Email", phone: "Телефон (необов'язково)", note: "Повідомлення (необов'язково)", submit: "Надіслати заявку",
  upcoming: "Найближчі зустрічі", full: "Група заповнена — можна стати в список очікування.",
  doneTitle: "Дякуємо!", donePending: "Заявку надіслано. Терапевт зв'яжеться з вами електронною поштою.", doneWait: "Ви в списку очікування. Терапевт повідомить, якщо з'явиться місце.", doneDup: "Ви вже подали заявку до цієї групи.",
  unavailable: "Ця сторінка реєстрації недоступна.", privacy: "Ваші дані бачить лише терапевт.",
};
const ru: Dict = {
  type: "Тип группы", regular: "Обычная группа", supervision: "Супервизионная группа",
  instructions: "Инструкция для участников", instructionsHint: "Отправляется в письме о подтверждении.",
  capacity: "Лимит мест", capacityHint: "Оставьте пустым, если лимита нет.", price: "Цена за встречу",
  absencePolicy: "Пропущенная встреча", chargeAbsent: "Оплачивать пропущенную проведённую встречу", noChargeAbsent: "Не оплачивать пропущенную встречу",
  publication: "Страница регистрации", published: "Опубликовано", unpublished: "Не опубликовано",
  publishHint: "Подать заявку может любой со ссылкой. Других участников не видно.",
  publish: "Опубликовать", unpublish: "Снять с публикации", copyLink: "Копировать ссылку", linkCopied: "Ссылка скопирована",
  registrations: "Заявки", noRegistrations: "Заявок пока нет",
  pending: "Новая", confirmed: "Подтверждено", rejected: "Отклонено", waitlisted: "Список ожидания", transferred: "Перенесено",
  confirm: "Подтвердить", reject: "Отклонить", toWaitlist: "В список ожидания", groupFull: "Группа заполнена. Увеличьте лимит или перенесите человека в список ожидания.",
  transfer: "Перенести выбранных", transferTitle: "Перенести в другую группу", targetGroup: "Целевая группа", newCopy: "Новая копия этой группы", newName: "Название новой группы", transferred_ok: "Заявители перенесены",
  copyGroup: "Копировать группу", copyOf: "копия", archive: "Архивировать", unarchive: "Восстановить", archived: "В архиве",
  deleteDesc: "Группа исчезнет из списка. Встречи, посещаемость, оплаты и заявки сохранятся.",
  sendMessage: "Написать участникам", subject: "Тема", message: "Сообщение", materialLink: "Ссылка на материал (https, необязательно)", send: "Отправить",
  sentCount: n => `Отправлено: ${n}`, emailDecision: "Уведомить письмом",
  supActive: "Активная работа", supObserver: "Наблюдатель", supNA: "—",
  applyTitle: "Подать заявку", yourName: "Ваше имя", email: "Email", phone: "Телефон (необязательно)", note: "Сообщение (необязательно)", submit: "Отправить заявку",
  upcoming: "Ближайшие встречи", full: "Группа заполнена — можно встать в список ожидания.",
  doneTitle: "Спасибо!", donePending: "Заявка отправлена. Терапевт свяжется с вами по электронной почте.", doneWait: "Вы в списке ожидания. Терапевт сообщит, если появится место.", doneDup: "Вы уже подали заявку в эту группу.",
  unavailable: "Эта страница регистрации недоступна.", privacy: "Ваши данные видит только терапевт.",
};
const pl: Dict = {
  type: "Typ grupy", regular: "Zwykła grupa", supervision: "Grupa superwizyjna",
  instructions: "Instrukcja dla uczestników", instructionsHint: "Wysyłana w e-mailu z potwierdzeniem.",
  capacity: "Limit miejsc", capacityHint: "Zostaw puste, jeśli bez limitu.", price: "Cena za spotkanie",
  absencePolicy: "Opuszczone spotkanie", chargeAbsent: "Płatne opuszczone odbyte spotkanie", noChargeAbsent: "Nie pobieraj opłaty za nieobecność",
  publication: "Strona zapisów", published: "Opublikowano", unpublished: "Nieopublikowano",
  publishHint: "Każdy z linkiem może się zgłosić. Inni uczestnicy nie są widoczni.",
  publish: "Opublikuj", unpublish: "Cofnij publikację", copyLink: "Kopiuj link", linkCopied: "Link skopiowany",
  registrations: "Zgłoszenia", noRegistrations: "Brak zgłoszeń",
  pending: "Nowe", confirmed: "Potwierdzone", rejected: "Odrzucone", waitlisted: "Lista oczekujących", transferred: "Przeniesione",
  confirm: "Potwierdź", reject: "Odrzuć", toWaitlist: "Na listę oczekujących", groupFull: "Grupa jest pełna. Zwiększ limit lub przenieś osobę na listę oczekujących.",
  transfer: "Przenieś wybrane", transferTitle: "Przenieś do innej grupy", targetGroup: "Grupa docelowa", newCopy: "Nowa kopia tej grupy", newName: "Nazwa nowej grupy", transferred_ok: "Przeniesiono",
  copyGroup: "Kopiuj grupę", copyOf: "kopia", archive: "Archiwizuj", unarchive: "Przywróć", archived: "W archiwum",
  deleteDesc: "Grupa zniknie z listy. Spotkania, obecność, płatności i zgłoszenia zostaną zachowane.",
  sendMessage: "Napisz do uczestników", subject: "Temat", message: "Wiadomość", materialLink: "Link do materiału (https, opcjonalnie)", send: "Wyślij",
  sentCount: n => `Wysłano: ${n}`, emailDecision: "Powiadom e-mailem",
  supActive: "Aktywna praca", supObserver: "Obserwator", supNA: "—",
  applyTitle: "Zgłoś się", yourName: "Imię", email: "E-mail", phone: "Telefon (opcjonalnie)", note: "Wiadomość (opcjonalnie)", submit: "Wyślij zgłoszenie",
  upcoming: "Najbliższe spotkania", full: "Grupa jest pełna — możesz zapisać się na listę oczekujących.",
  doneTitle: "Dziękujemy!", donePending: "Zgłoszenie wysłane. Terapeuta odezwie się e-mailem.", doneWait: "Jesteś na liście oczekujących. Terapeuta da znać, gdy zwolni się miejsce.", doneDup: "Już zgłosiłeś(-aś) się do tej grupy.",
  unavailable: "Ta strona zapisów jest niedostępna.", privacy: "Twoje dane widzi tylko terapeuta.",
};
const de: Dict = {
  type: "Gruppentyp", regular: "Reguläre Gruppe", supervision: "Supervisionsgruppe",
  instructions: "Hinweise für Teilnehmende", instructionsHint: "Wird in der Bestätigungs-E-Mail gesendet.",
  capacity: "Platzlimit", capacityHint: "Leer lassen für kein Limit.", price: "Preis pro Treffen",
  absencePolicy: "Verpasstes Treffen", chargeAbsent: "Verpasstes stattgefundenes Treffen berechnen", noChargeAbsent: "Verpasste Treffen nicht berechnen",
  publication: "Anmeldeseite", published: "Veröffentlicht", unpublished: "Nicht veröffentlicht",
  publishHint: "Jede Person mit dem Link kann sich anmelden. Andere Teilnehmende sind nie sichtbar.",
  publish: "Veröffentlichen", unpublish: "Zurückziehen", copyLink: "Link kopieren", linkCopied: "Link kopiert",
  registrations: "Anmeldungen", noRegistrations: "Noch keine Anmeldungen",
  pending: "Neu", confirmed: "Bestätigt", rejected: "Abgelehnt", waitlisted: "Warteliste", transferred: "Verschoben",
  confirm: "Bestätigen", reject: "Ablehnen", toWaitlist: "Auf Warteliste", groupFull: "Die Gruppe ist voll. Erhöhen Sie das Limit oder setzen Sie die Person auf die Warteliste.",
  transfer: "Auswahl verschieben", transferTitle: "In andere Gruppe verschieben", targetGroup: "Zielgruppe", newCopy: "Neue Kopie dieser Gruppe", newName: "Name der neuen Gruppe", transferred_ok: "Verschoben",
  copyGroup: "Gruppe kopieren", copyOf: "Kopie", archive: "Archivieren", unarchive: "Wiederherstellen", archived: "Archiviert",
  deleteDesc: "Die Gruppe verschwindet aus der Liste. Treffen, Anwesenheit, Zahlungen und Anmeldungen bleiben gespeichert.",
  sendMessage: "Teilnehmende anschreiben", subject: "Betreff", message: "Nachricht", materialLink: "Link zum Material (https, optional)", send: "Senden",
  sentCount: n => `Gesendet: ${n}`, emailDecision: "Per E-Mail benachrichtigen",
  supActive: "Aktive Arbeit", supObserver: "Beobachtend", supNA: "—",
  applyTitle: "Anmelden", yourName: "Ihr Name", email: "E-Mail", phone: "Telefon (optional)", note: "Nachricht (optional)", submit: "Anmeldung senden",
  upcoming: "Nächste Treffen", full: "Die Gruppe ist voll — Sie können sich auf die Warteliste setzen.",
  doneTitle: "Danke!", donePending: "Ihre Anmeldung wurde gesendet. Sie erhalten eine Antwort per E-Mail.", doneWait: "Sie stehen auf der Warteliste. Wir melden uns, wenn ein Platz frei wird.", doneDup: "Sie haben sich bereits für diese Gruppe angemeldet.",
  unavailable: "Diese Anmeldeseite ist nicht verfügbar.", privacy: "Ihre Angaben sieht nur die Therapeutin bzw. der Therapeut.",
};
const fr: Dict = {
  type: "Type de groupe", regular: "Groupe régulier", supervision: "Groupe de supervision",
  instructions: "Consignes pour les participants", instructionsHint: "Envoyées dans l’e-mail de confirmation.",
  capacity: "Nombre de places", capacityHint: "Laisser vide pour aucune limite.", price: "Prix par rencontre",
  absencePolicy: "Rencontre manquée", chargeAbsent: "Facturer une rencontre tenue mais manquée", noChargeAbsent: "Ne pas facturer les absences",
  publication: "Page d’inscription", published: "Publiée", unpublished: "Non publiée",
  publishHint: "Toute personne ayant le lien peut postuler. Les autres participants ne sont jamais affichés.",
  publish: "Publier", unpublish: "Dépublier", copyLink: "Copier le lien", linkCopied: "Lien copié",
  registrations: "Demandes", noRegistrations: "Aucune demande",
  pending: "Nouvelle", confirmed: "Confirmée", rejected: "Refusée", waitlisted: "Liste d’attente", transferred: "Transférée",
  confirm: "Confirmer", reject: "Refuser", toWaitlist: "En liste d’attente", groupFull: "Le groupe est complet. Augmentez la limite ou placez la personne en liste d’attente.",
  transfer: "Transférer la sélection", transferTitle: "Transférer vers un autre groupe", targetGroup: "Groupe cible", newCopy: "Nouvelle copie de ce groupe", newName: "Nom du nouveau groupe", transferred_ok: "Transférées",
  copyGroup: "Copier le groupe", copyOf: "copie", archive: "Archiver", unarchive: "Restaurer", archived: "Archivé",
  deleteDesc: "Le groupe disparaît de la liste. Rencontres, présences, paiements et demandes restent enregistrés.",
  sendMessage: "Écrire aux participants", subject: "Objet", message: "Message", materialLink: "Lien vers le support (https, facultatif)", send: "Envoyer",
  sentCount: n => `Envoyés : ${n}`, emailDecision: "Prévenir par e-mail",
  supActive: "Travail actif", supObserver: "Observateur", supNA: "—",
  applyTitle: "Postuler", yourName: "Votre nom", email: "E-mail", phone: "Téléphone (facultatif)", note: "Message (facultatif)", submit: "Envoyer la demande",
  upcoming: "Prochaines rencontres", full: "Le groupe est complet — vous pouvez rejoindre la liste d’attente.",
  doneTitle: "Merci !", donePending: "Votre demande a été envoyée. Le thérapeute vous répondra par e-mail.", doneWait: "Vous êtes sur liste d’attente. Le thérapeute vous préviendra si une place se libère.", doneDup: "Vous avez déjà postulé à ce groupe.",
  unavailable: "Cette page d’inscription n’est pas disponible.", privacy: "Seul le thérapeute voit vos informations.",
};

const DICTS: Record<AppLanguage, Dict> = { en, uk, ru, pl, de, fr } as Record<AppLanguage, Dict>;
export const groupsText = (lang: string): Dict => DICTS[lang as AppLanguage] ?? en;
export const groupSignupUrl = (token: string, lang?: string) =>
  `${window.location.origin}/group/${token}${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`;

/** Billing rule shared by UI and tests: a missed held meeting is charged only if the group says so; cancelled meetings never are. */
export function chargeableForAttendance(opts: { meetingStatus: string; attendance: string; chargeAbsent: boolean; chargePresent?: boolean }) {
  if (opts.meetingStatus === "cancelled") return false;
  if (opts.attendance === "attended") return opts.chargePresent ?? true;
  if (opts.attendance === "absent") return opts.chargeAbsent;
  return false;
}
