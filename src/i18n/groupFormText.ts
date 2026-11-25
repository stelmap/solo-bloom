const en = {
  formTitle: "Application form", preview: "Preview form", save: "Save form", saved: "Form saved",
  addField: "Add field", custom: "Custom field", label: "Question", hint: "Hint (optional)", required: "Required",
  options: "Options (one per line)", type: "Answer type", short: "Short text", long: "Long text", dropdown: "Dropdown", checkbox: "Checkbox",
  system: "Always required", errLabel: "Enter a question", errOptions: "Add at least two options", errDup: "Options must be different",
  image: "Form image", upload: "Upload image", replace: "Replace", remove: "Remove", imageErr: "Image upload failed. Previous settings are kept.", imageHint: "JPG, PNG or WebP up to 5 MB.",
  name: "Your name", email: "Email", choose: "Choose…", answers: "Answers",
  presets: { telegram: "Telegram", facebook: "Facebook", instagram: "Instagram", phone: "Phone", other: "Other contact" },
  addSession: "Add meeting", finance: "Money", charged: "Charged", received: "Received", outstanding: "Awaiting payment",
  whoOwes: "Who owes", noDebt: "Nobody owes for this group.", applications: "Applications", uniquePeople: "Confirmed participants",
  financeNote: "Taken from payments created when meetings of this group are closed in the calendar.", errSave: "Fix the highlighted fields",
};
type D = typeof en;
const uk: D = {
  formTitle: "Форма заявки", preview: "Переглянути форму", save: "Зберегти форму", saved: "Форму збережено",
  addField: "Додати поле", custom: "Власне поле", label: "Питання", hint: "Підказка (необов’язково)", required: "Обов’язкове",
  options: "Варіанти (по одному в рядку)", type: "Тип відповіді", short: "Короткий текст", long: "Довгий текст", dropdown: "Список", checkbox: "Позначка",
  system: "Завжди обов’язкове", errLabel: "Введіть питання", errOptions: "Додайте щонайменше два варіанти", errDup: "Варіанти мають відрізнятися",
  image: "Зображення форми", upload: "Завантажити зображення", replace: "Замінити", remove: "Видалити", imageErr: "Не вдалося завантажити зображення. Попередні налаштування збережено.", imageHint: "JPG, PNG або WebP до 5 МБ.",
  name: "Ваше ім’я", email: "Email", choose: "Оберіть…", answers: "Відповіді",
  presets: { telegram: "Telegram", facebook: "Facebook", instagram: "Instagram", phone: "Телефон", other: "Інший контакт" },
  addSession: "Додати зустріч", finance: "Гроші", charged: "Нараховано", received: "Отримано", outstanding: "Очікується оплата",
  whoOwes: "Хто винен", noDebt: "За цією групою ніхто не винен.", applications: "Заявки", uniquePeople: "Підтверджені учасники",
  financeNote: "Дані беруться з оплат, створених під час закриття зустрічей цієї групи в календарі.", errSave: "Виправте позначені поля",
};
const ru: D = {
  formTitle: "Форма заявки", preview: "Просмотреть форму", save: "Сохранить форму", saved: "Форма сохранена",
  addField: "Добавить поле", custom: "Своё поле", label: "Вопрос", hint: "Подсказка (необязательно)", required: "Обязательное",
  options: "Варианты (по одному в строке)", type: "Тип ответа", short: "Короткий текст", long: "Длинный текст", dropdown: "Список", checkbox: "Отметка",
  system: "Всегда обязательное", errLabel: "Введите вопрос", errOptions: "Добавьте минимум два варианта", errDup: "Варианты должны различаться",
  image: "Изображение формы", upload: "Загрузить изображение", replace: "Заменить", remove: "Удалить", imageErr: "Не удалось загрузить изображение. Прежние настройки сохранены.", imageHint: "JPG, PNG или WebP до 5 МБ.",
  name: "Ваше имя", email: "Email", choose: "Выберите…", answers: "Ответы",
  presets: { telegram: "Telegram", facebook: "Facebook", instagram: "Instagram", phone: "Телефон", other: "Другой контакт" },
  addSession: "Добавить встречу", finance: "Деньги", charged: "Начислено", received: "Получено", outstanding: "Ожидается оплата",
  whoOwes: "Кто должен", noDebt: "По этой группе никто не должен.", applications: "Заявки", uniquePeople: "Подтверждённые участники",
  financeNote: "Данные берутся из оплат, созданных при закрытии встреч этой группы в календаре.", errSave: "Исправьте отмеченные поля",
};
const pl: D = {
  formTitle: "Formularz zgłoszenia", preview: "Podgląd formularza", save: "Zapisz formularz", saved: "Formularz zapisany",
  addField: "Dodaj pole", custom: "Własne pole", label: "Pytanie", hint: "Podpowiedź (opcjonalnie)", required: "Wymagane",
  options: "Opcje (jedna w wierszu)", type: "Typ odpowiedzi", short: "Krótki tekst", long: "Długi tekst", dropdown: "Lista", checkbox: "Pole wyboru",
  system: "Zawsze wymagane", errLabel: "Wpisz pytanie", errOptions: "Dodaj co najmniej dwie opcje", errDup: "Opcje muszą się różnić",
  image: "Obraz formularza", upload: "Prześlij obraz", replace: "Zamień", remove: "Usuń", imageErr: "Nie udało się przesłać obrazu. Poprzednie ustawienia zachowano.", imageHint: "JPG, PNG lub WebP do 5 MB.",
  name: "Twoje imię", email: "Email", choose: "Wybierz…", answers: "Odpowiedzi",
  presets: { telegram: "Telegram", facebook: "Facebook", instagram: "Instagram", phone: "Telefon", other: "Inny kontakt" },
  addSession: "Dodaj spotkanie", finance: "Pieniądze", charged: "Naliczono", received: "Otrzymano", outstanding: "Oczekuje na płatność",
  whoOwes: "Kto zalega", noDebt: "Nikt nie zalega za tę grupę.", applications: "Zgłoszenia", uniquePeople: "Potwierdzeni uczestnicy",
  financeNote: "Dane pochodzą z płatności utworzonych przy zamykaniu spotkań tej grupy w kalendarzu.", errSave: "Popraw zaznaczone pola",
};
const de: D = {
  formTitle: "Anmeldeformular", preview: "Formular ansehen", save: "Formular speichern", saved: "Formular gespeichert",
  addField: "Feld hinzufügen", custom: "Eigenes Feld", label: "Frage", hint: "Hinweis (optional)", required: "Pflichtfeld",
  options: "Optionen (eine pro Zeile)", type: "Antworttyp", short: "Kurzer Text", long: "Langer Text", dropdown: "Auswahlliste", checkbox: "Kontrollkästchen",
  system: "Immer erforderlich", errLabel: "Frage eingeben", errOptions: "Mindestens zwei Optionen hinzufügen", errDup: "Optionen müssen sich unterscheiden",
  image: "Formularbild", upload: "Bild hochladen", replace: "Ersetzen", remove: "Entfernen", imageErr: "Bild-Upload fehlgeschlagen. Bisherige Einstellungen bleiben erhalten.", imageHint: "JPG, PNG oder WebP bis 5 MB.",
  name: "Ihr Name", email: "E-Mail", choose: "Auswählen…", answers: "Antworten",
  presets: { telegram: "Telegram", facebook: "Facebook", instagram: "Instagram", phone: "Telefon", other: "Anderer Kontakt" },
  addSession: "Treffen hinzufügen", finance: "Geld", charged: "Berechnet", received: "Erhalten", outstanding: "Offene Zahlung",
  whoOwes: "Wer schuldet", noDebt: "Für diese Gruppe schuldet niemand etwas.", applications: "Anmeldungen", uniquePeople: "Bestätigte Teilnehmende",
  financeNote: "Aus Zahlungen, die beim Abschließen der Gruppentreffen im Kalender entstehen.", errSave: "Markierte Felder korrigieren",
};
const fr: D = {
  formTitle: "Formulaire d’inscription", preview: "Aperçu du formulaire", save: "Enregistrer le formulaire", saved: "Formulaire enregistré",
  addField: "Ajouter un champ", custom: "Champ personnalisé", label: "Question", hint: "Indication (facultatif)", required: "Obligatoire",
  options: "Options (une par ligne)", type: "Type de réponse", short: "Texte court", long: "Texte long", dropdown: "Liste", checkbox: "Case à cocher",
  system: "Toujours obligatoire", errLabel: "Saisissez une question", errOptions: "Ajoutez au moins deux options", errDup: "Les options doivent être différentes",
  image: "Image du formulaire", upload: "Téléverser une image", replace: "Remplacer", remove: "Supprimer", imageErr: "Échec du téléversement. Les réglages précédents sont conservés.", imageHint: "JPG, PNG ou WebP jusqu’à 5 Mo.",
  name: "Votre nom", email: "E-mail", choose: "Choisir…", answers: "Réponses",
  presets: { telegram: "Telegram", facebook: "Facebook", instagram: "Instagram", phone: "Téléphone", other: "Autre contact" },
  addSession: "Ajouter une séance", finance: "Argent", charged: "Facturé", received: "Reçu", outstanding: "En attente de paiement",
  whoOwes: "Qui doit", noDebt: "Personne ne doit rien pour ce groupe.", applications: "Demandes", uniquePeople: "Participants confirmés",
  financeNote: "Issu des paiements créés à la clôture des séances de ce groupe dans le calendrier.", errSave: "Corrigez les champs signalés",
};
const all: Record<string, D> = { en, uk, ru, pl, de, fr };
export const groupFormText = (lang: string) => all[lang] ?? en;
