import { sanitizeProfileHtml as sanitizeNoteHtml } from "@/lib/richText";

export const THERAPIST_FILES_BUCKET = "therapist-profile-files";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type TherapistDoc = { path: string; caption: string; kind: "pdf" | "image" };
export type TherapistSocial = { label: string; url: string };
export type TherapistProfileData = {
  first_name: string; last_name: string; patronymic: string; title: string;
  photo: string | null;
  city: string; address: string; online: boolean; offline: boolean;
  email: string; phone: string; socials: TherapistSocial[];
  about_html: string; education_html: string; expertise: string[];
  documents: TherapistDoc[];
};

export const emptyProfile = (): TherapistProfileData => ({
  first_name: "", last_name: "", patronymic: "", title: "", photo: null,
  city: "", address: "", online: true, offline: false, email: "", phone: "", socials: [],
  about_html: "", education_html: "", expertise: [], documents: [],
});

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
export const isSafeUrl = (u: string) => /^https?:\/\/[^\s]+$/i.test(u.trim());

/** Normalise untrusted JSON (draft or published) into a safe profile. */
export function normalizeProfile(raw: unknown): TherapistProfileData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const e = emptyProfile();
  return {
    first_name: str(r.first_name, 80), last_name: str(r.last_name, 80), patronymic: str(r.patronymic, 80),
    title: str(r.title, 120), photo: typeof r.photo === "string" ? r.photo : null,
    city: str(r.city, 120), address: str(r.address, 250),
    online: typeof r.online === "boolean" ? r.online : e.online, offline: !!r.offline,
    email: str(r.email, 200), phone: str(r.phone, 40),
    socials: Array.isArray(r.socials) ? r.socials.slice(0, 10).map((s: any) => ({ label: str(s?.label, 40), url: str(s?.url, 300) })) : [],
    about_html: sanitizeNoteHtml(str(r.about_html, 20000)),
    education_html: sanitizeNoteHtml(str(r.education_html, 20000)),
    expertise: Array.isArray(r.expertise) ? r.expertise.map((x: unknown) => str(x, 60)).filter(Boolean).slice(0, 30) : [],
    documents: Array.isArray(r.documents)
      ? r.documents.filter((d: any) => typeof d?.path === "string").slice(0, 30)
          .map((d: any) => ({ path: d.path, caption: str(d.caption, 150), kind: d.kind === "pdf" ? "pdf" : "image" }))
      : [],
  };
}

/** Build the publishable copy: drop invalid links/contacts, keep only own files. */
export function toPublished(p: TherapistProfileData, userId: string) {
  const own = (path: string | null) => !!path && path.startsWith(`${userId}/`);
  const data: TherapistProfileData = {
    ...normalizeProfile(p),
    socials: p.socials.filter((s) => s.label.trim() && isSafeUrl(s.url)),
    photo: own(p.photo) ? p.photo : null,
    documents: p.documents.filter((d) => own(d.path)),
  };
  const files = [data.photo, ...data.documents.map((d) => d.path)].filter(Boolean) as string[];
  return { data, files };
}

export const fullName = (p: TherapistProfileData) => [p.first_name, p.patronymic, p.last_name].filter((s) => s.trim()).join(" ");

/** Check the real file signature, not just the extension. */
export async function detectFileKind(file: File): Promise<"pdf" | "png" | "jpeg" | null> {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  return null;
}

/** Square crop with zoom & offset (-1..1) → 800px JPEG. */
export async function cropSquare(file: File, zoom = 1, ox = 0, oy = 0): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const side = Math.min(img.width, img.height) / Math.max(1, zoom);
    const sx = (img.width - side) / 2 * (1 + ox);
    const sy = (img.height - side) / 2 * (1 + oy);
    const c = document.createElement("canvas"); c.width = c.height = 800;
    c.getContext("2d")!.drawImage(img, sx, sy, side, side, 0, 0, 800, 800);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("crop failed"))), "image/jpeg", 0.9));
  } finally { URL.revokeObjectURL(url); }
}

export type TPLang = "uk" | "en" | "pl" | "de" | "fr" | "ru";
export const tpLang = (v: unknown): TPLang => {
  const s = String(v || "").toLowerCase().slice(0, 2);
  return (["uk", "en", "pl", "de", "fr", "ru"].includes(s) ? s : "en") as TPLang;
};

type Copy = Record<string, string>;
export const TP_COPY: Record<TPLang, Copy> = {
  en: {
    linkTitle: "Your public profile", notPublished: "Not published", publishToShare: "Publish the profile to share the link", copyLink: "Copy link", linkCopied: "Link copied", viewProfile: "View profile", share: "Share", instagramHint: "Copy the link and add it to your Instagram bio",
    trialUntil: "Free trial until {d}", proOnly: "The public profile is now part of the Pro plan. Your draft is saved; upgrade to show it to clients again.", upgrade: "See plans",
    publishCheckbox: "Publish my professional profile", saveChanges: "Save changes", tabPractice: "Practice settings", tabAbout: "About me", editor: "Profile editor", draft: "Draft", published: "Published", unpublishedChanges: "Unpublished changes",
    photo: "Photo", uploadPhoto: "Upload photo", replacePhoto: "Replace photo", removePhoto: "Remove", cropTitle: "Crop photo", zoom: "Zoom", horizontal: "Horizontal", vertical: "Vertical", apply: "Apply", cancel: "Cancel",
    firstName: "First name", lastName: "Last name", patronymic: "Patronymic (optional)", proTitle: "Professional title", proTitlePh: "e.g. Psychotherapist",
    location: "Practice location", city: "City", address: "Office address", online: "Online", offline: "In person",
    contacts: "Contact details", email: "Email", phone: "Phone", socials: "Social links", socialLabel: "Name (e.g. Instagram)", addLink: "Add link",
    about: "About me", aboutPh: "Write briefly about yourself, your approach and experience…", education: "Education and qualifications",
    expertise: "Areas of expertise", expertisePh: "Type a topic and press Enter", add: "Add",
    documents: "Diplomas and certificates", addDocs: "Add documents", docsHint: "PDF, JPG, PNG · up to 10 MB each", caption: "Caption",
    up: "Move up", down: "Move down", replace: "Replace", delete: "Delete",
    saveDraft: "Save draft", preview: "Preview", publish: "Publish", update: "Publish changes", unpublish: "Unpublish", saved: "Draft saved", publishedOk: "Profile published", unpublishedOk: "Profile hidden from clients",
    nameRequired: "Enter at least your first name.", badFile: "Only PDF, JPG or PNG files up to 10 MB.", needLink: "Turn on your public booking link first so clients can open the profile.",
    publicNote: "Anyone with your booking link can see what you publish. Drafts stay private.",
    book: "Book an appointment", aboutNav: "About me", bookingNav: "Booking", previewTitle: "Profile preview", close: "Close", openDoc: "Open document", format: "Format",
  },
  uk: {
    linkTitle: "Ваш публічний профіль", notPublished: "Не опубліковано", publishToShare: "Опублікуйте профіль, щоб поділитися посиланням", copyLink: "Копіювати посилання", linkCopied: "Посилання скопійовано", viewProfile: "Переглянути профіль", share: "Поділитися", instagramHint: "Скопіюйте посилання та додайте його в біографію Instagram",
    trialUntil: "Безкоштовний тріал до {d}", proOnly: "Публічний профіль тепер входить у тариф Pro. Чернетку збережено; оновіть тариф, щоб знову показувати його клієнтам.", upgrade: "Переглянути тарифи",
    publishCheckbox: "Публікувати мій профіль", saveChanges: "Зберегти зміни", tabPractice: "Налаштування практики", tabAbout: "Про мене", editor: "Редактор профілю", draft: "Чернетка", published: "Опубліковано", unpublishedChanges: "Є неопубліковані зміни",
    photo: "Фотографія", uploadPhoto: "Завантажити фото", replacePhoto: "Замінити фото", removePhoto: "Видалити", cropTitle: "Кадрування фото", zoom: "Масштаб", horizontal: "По горизонталі", vertical: "По вертикалі", apply: "Застосувати", cancel: "Скасувати",
    firstName: "Ім'я", lastName: "Прізвище", patronymic: "По батькові (необов'язково)", proTitle: "Професійний титул", proTitlePh: "напр. Психотерапевт",
    location: "Місце практики", city: "Місто", address: "Адреса кабінету", online: "Онлайн", offline: "Офлайн",
    contacts: "Контакти", email: "Email", phone: "Телефон", socials: "Соціальні мережі", socialLabel: "Назва (напр. Instagram)", addLink: "Додати посилання",
    about: "Про мене", aboutPh: "Напишіть коротко про себе, ваш підхід та досвід…", education: "Освіта та кваліфікація",
    expertise: "З якими запитами працюю", expertisePh: "Введіть тему й натисніть Enter", add: "Додати",
    documents: "Дипломи та сертифікати", addDocs: "Додати документи", docsHint: "PDF, JPG, PNG · до 10 МБ кожен", caption: "Підпис",
    up: "Вище", down: "Нижче", replace: "Замінити", delete: "Видалити",
    saveDraft: "Зберегти чернетку", preview: "Переглянути", publish: "Опублікувати", update: "Опублікувати зміни", unpublish: "Зняти з публікації", saved: "Чернетку збережено", publishedOk: "Профіль опубліковано", unpublishedOk: "Профіль приховано від клієнтів",
    nameRequired: "Вкажіть щонайменше ім'я.", badFile: "Лише PDF, JPG або PNG до 10 МБ.", needLink: "Спершу увімкніть посилання для запису, щоб клієнти могли відкрити профіль.",
    publicNote: "Опубліковане бачить кожен, хто має ваше посилання для запису. Чернетки залишаються приватними.",
    book: "Записатися на зустріч", aboutNav: "Про мене", bookingNav: "Запис", previewTitle: "Попередній перегляд", close: "Закрити", openDoc: "Відкрити документ", format: "Формат",
  },
  pl: {
    linkTitle: "Twój profil publiczny", notPublished: "Nieopublikowany", publishToShare: "Opublikuj profil, aby udostępnić link", copyLink: "Kopiuj link", linkCopied: "Link skopiowany", viewProfile: "Zobacz profil", share: "Udostępnij", instagramHint: "Skopiuj link i dodaj go do bio na Instagramie",
    trialUntil: "Darmowy okres próbny do {d}", proOnly: "Profil publiczny jest teraz w planie Pro. Szkic jest zapisany; zmień plan, aby znów pokazać go klientom.", upgrade: "Zobacz plany",
    publishCheckbox: "Publikuj mój profil zawodowy", saveChanges: "Zapisz zmiany", tabPractice: "Ustawienia praktyki", tabAbout: "O mnie", editor: "Edytor profilu", draft: "Szkic", published: "Opublikowano", unpublishedChanges: "Nieopublikowane zmiany",
    photo: "Zdjęcie", uploadPhoto: "Prześlij zdjęcie", replacePhoto: "Zmień zdjęcie", removePhoto: "Usuń", cropTitle: "Kadrowanie zdjęcia", zoom: "Powiększenie", horizontal: "W poziomie", vertical: "W pionie", apply: "Zastosuj", cancel: "Anuluj",
    firstName: "Imię", lastName: "Nazwisko", patronymic: "Drugie imię (opcjonalnie)", proTitle: "Tytuł zawodowy", proTitlePh: "np. Psychoterapeuta",
    location: "Miejsce praktyki", city: "Miasto", address: "Adres gabinetu", online: "Online", offline: "Stacjonarnie",
    contacts: "Kontakt", email: "Email", phone: "Telefon", socials: "Media społecznościowe", socialLabel: "Nazwa (np. Instagram)", addLink: "Dodaj link",
    about: "O mnie", aboutPh: "Napisz krótko o sobie, swoim podejściu i doświadczeniu…", education: "Wykształcenie i kwalifikacje",
    expertise: "Z czym pracuję", expertisePh: "Wpisz temat i naciśnij Enter", add: "Dodaj",
    documents: "Dyplomy i certyfikaty", addDocs: "Dodaj dokumenty", docsHint: "PDF, JPG, PNG · do 10 MB każdy", caption: "Podpis",
    up: "W górę", down: "W dół", replace: "Zamień", delete: "Usuń",
    saveDraft: "Zapisz szkic", preview: "Podgląd", publish: "Opublikuj", update: "Opublikuj zmiany", unpublish: "Cofnij publikację", saved: "Szkic zapisany", publishedOk: "Profil opublikowany", unpublishedOk: "Profil ukryty przed klientami",
    nameRequired: "Podaj przynajmniej imię.", badFile: "Tylko PDF, JPG lub PNG do 10 MB.", needLink: "Najpierw włącz link do rezerwacji, aby klienci mogli otworzyć profil.",
    publicNote: "Każdy z Twoim linkiem do rezerwacji widzi opublikowane dane. Szkice pozostają prywatne.",
    book: "Umów spotkanie", aboutNav: "O mnie", bookingNav: "Rezerwacja", previewTitle: "Podgląd profilu", close: "Zamknij", openDoc: "Otwórz dokument", format: "Forma",
  },
  de: {
    linkTitle: "Ihr öffentliches Profil", notPublished: "Nicht veröffentlicht", publishToShare: "Veröffentlichen Sie das Profil, um den Link zu teilen", copyLink: "Link kopieren", linkCopied: "Link kopiert", viewProfile: "Profil ansehen", share: "Teilen", instagramHint: "Kopieren Sie den Link und fügen Sie ihn in Ihre Instagram-Bio ein",
    trialUntil: "Kostenlos testen bis {d}", proOnly: "Das öffentliche Profil ist jetzt Teil von Pro. Ihr Entwurf bleibt gespeichert; upgraden Sie, um ihn wieder anzuzeigen.", upgrade: "Pläne ansehen",
    publishCheckbox: "Mein berufliches Profil veröffentlichen", saveChanges: "Änderungen speichern", tabPractice: "Praxiseinstellungen", tabAbout: "Über mich", editor: "Profil-Editor", draft: "Entwurf", published: "Veröffentlicht", unpublishedChanges: "Unveröffentlichte Änderungen",
    photo: "Foto", uploadPhoto: "Foto hochladen", replacePhoto: "Foto ersetzen", removePhoto: "Entfernen", cropTitle: "Foto zuschneiden", zoom: "Zoom", horizontal: "Horizontal", vertical: "Vertikal", apply: "Übernehmen", cancel: "Abbrechen",
    firstName: "Vorname", lastName: "Nachname", patronymic: "Zweiter Vorname (optional)", proTitle: "Berufsbezeichnung", proTitlePh: "z. B. Psychotherapeutin",
    location: "Praxisort", city: "Stadt", address: "Praxisadresse", online: "Online", offline: "Vor Ort",
    contacts: "Kontakt", email: "E-Mail", phone: "Telefon", socials: "Soziale Netzwerke", socialLabel: "Name (z. B. Instagram)", addLink: "Link hinzufügen",
    about: "Über mich", aboutPh: "Schreiben Sie kurz über sich, Ihren Ansatz und Ihre Erfahrung…", education: "Ausbildung und Qualifikationen",
    expertise: "Schwerpunkte", expertisePh: "Thema eingeben und Enter drücken", add: "Hinzufügen",
    documents: "Diplome und Zertifikate", addDocs: "Dokumente hinzufügen", docsHint: "PDF, JPG, PNG · je bis 10 MB", caption: "Beschriftung",
    up: "Nach oben", down: "Nach unten", replace: "Ersetzen", delete: "Löschen",
    saveDraft: "Entwurf speichern", preview: "Vorschau", publish: "Veröffentlichen", update: "Änderungen veröffentlichen", unpublish: "Veröffentlichung aufheben", saved: "Entwurf gespeichert", publishedOk: "Profil veröffentlicht", unpublishedOk: "Profil für Klienten ausgeblendet",
    nameRequired: "Bitte mindestens den Vornamen angeben.", badFile: "Nur PDF, JPG oder PNG bis 10 MB.", needLink: "Aktivieren Sie zuerst Ihren Buchungslink, damit Klienten das Profil öffnen können.",
    publicNote: "Alle mit Ihrem Buchungslink sehen, was Sie veröffentlichen. Entwürfe bleiben privat.",
    book: "Termin buchen", aboutNav: "Über mich", bookingNav: "Buchung", previewTitle: "Profilvorschau", close: "Schließen", openDoc: "Dokument öffnen", format: "Format",
  },
  fr: {
    linkTitle: "Votre profil public", notPublished: "Non publié", publishToShare: "Publiez le profil pour partager le lien", copyLink: "Copier le lien", linkCopied: "Lien copié", viewProfile: "Voir le profil", share: "Partager", instagramHint: "Copiez le lien et ajoutez-le à votre bio Instagram",
    trialUntil: "Essai gratuit jusqu'au {d}", proOnly: "Le profil public fait désormais partie de Pro. Votre brouillon est conservé ; passez à Pro pour l'afficher à nouveau.", upgrade: "Voir les offres",
    publishCheckbox: "Publier mon profil professionnel", saveChanges: "Enregistrer", tabPractice: "Paramètres du cabinet", tabAbout: "À propos", editor: "Éditeur du profil", draft: "Brouillon", published: "Publié", unpublishedChanges: "Modifications non publiées",
    photo: "Photo", uploadPhoto: "Importer une photo", replacePhoto: "Remplacer la photo", removePhoto: "Supprimer", cropTitle: "Recadrer la photo", zoom: "Zoom", horizontal: "Horizontal", vertical: "Vertical", apply: "Appliquer", cancel: "Annuler",
    firstName: "Prénom", lastName: "Nom", patronymic: "Deuxième prénom (facultatif)", proTitle: "Titre professionnel", proTitlePh: "ex. Psychothérapeute",
    location: "Lieu de pratique", city: "Ville", address: "Adresse du cabinet", online: "En ligne", offline: "En présentiel",
    contacts: "Coordonnées", email: "E-mail", phone: "Téléphone", socials: "Réseaux sociaux", socialLabel: "Nom (ex. Instagram)", addLink: "Ajouter un lien",
    about: "À propos de moi", aboutPh: "Décrivez brièvement votre approche et votre expérience…", education: "Formation et qualifications",
    expertise: "Domaines d'accompagnement", expertisePh: "Saisissez un thème puis Entrée", add: "Ajouter",
    documents: "Diplômes et certificats", addDocs: "Ajouter des documents", docsHint: "PDF, JPG, PNG · 10 Mo max chacun", caption: "Légende",
    up: "Monter", down: "Descendre", replace: "Remplacer", delete: "Supprimer",
    saveDraft: "Enregistrer le brouillon", preview: "Aperçu", publish: "Publier", update: "Publier les modifications", unpublish: "Dépublier", saved: "Brouillon enregistré", publishedOk: "Profil publié", unpublishedOk: "Profil masqué aux clients",
    nameRequired: "Indiquez au moins votre prénom.", badFile: "Uniquement PDF, JPG ou PNG jusqu'à 10 Mo.", needLink: "Activez d'abord votre lien de réservation pour que les clients puissent ouvrir le profil.",
    publicNote: "Toute personne ayant votre lien de réservation voit ce que vous publiez. Les brouillons restent privés.",
    book: "Prendre rendez-vous", aboutNav: "À propos", bookingNav: "Réservation", previewTitle: "Aperçu du profil", close: "Fermer", openDoc: "Ouvrir le document", format: "Format",
  },
  ru: {
    linkTitle: "Ваш публичный профиль", notPublished: "Не опубликовано", publishToShare: "Опубликуйте профиль, чтобы поделиться ссылкой", copyLink: "Копировать ссылку", linkCopied: "Ссылка скопирована", viewProfile: "Посмотреть профиль", share: "Поделиться", instagramHint: "Скопируйте ссылку и добавьте её в био Instagram",
    trialUntil: "Бесплатный триал до {d}", proOnly: "Публичный профиль теперь входит в тариф Pro. Черновик сохранён; обновите тариф, чтобы снова показывать его клиентам.", upgrade: "Посмотреть тарифы",
    publishCheckbox: "Публиковать мой профиль", saveChanges: "Сохранить изменения", tabPractice: "Настройки практики", tabAbout: "Обо мне", editor: "Редактор профиля", draft: "Черновик", published: "Опубликовано", unpublishedChanges: "Есть неопубликованные изменения",
    photo: "Фотография", uploadPhoto: "Загрузить фото", replacePhoto: "Заменить фото", removePhoto: "Удалить", cropTitle: "Кадрирование фото", zoom: "Масштаб", horizontal: "По горизонтали", vertical: "По вертикали", apply: "Применить", cancel: "Отмена",
    firstName: "Имя", lastName: "Фамилия", patronymic: "Отчество (необязательно)", proTitle: "Профессиональный титул", proTitlePh: "напр. Психотерапевт",
    location: "Место практики", city: "Город", address: "Адрес кабинета", online: "Онлайн", offline: "Офлайн",
    contacts: "Контакты", email: "Email", phone: "Телефон", socials: "Социальные сети", socialLabel: "Название (напр. Instagram)", addLink: "Добавить ссылку",
    about: "Обо мне", aboutPh: "Напишите кратко о себе, вашем подходе и опыте…", education: "Образование и квалификация",
    expertise: "С какими запросами работаю", expertisePh: "Введите тему и нажмите Enter", add: "Добавить",
    documents: "Дипломы и сертификаты", addDocs: "Добавить документы", docsHint: "PDF, JPG, PNG · до 10 МБ каждый", caption: "Подпись",
    up: "Выше", down: "Ниже", replace: "Заменить", delete: "Удалить",
    saveDraft: "Сохранить черновик", preview: "Просмотр", publish: "Опубликовать", update: "Опубликовать изменения", unpublish: "Снять с публикации", saved: "Черновик сохранён", publishedOk: "Профиль опубликован", unpublishedOk: "Профиль скрыт от клиентов",
    nameRequired: "Укажите хотя бы имя.", badFile: "Только PDF, JPG или PNG до 10 МБ.", needLink: "Сначала включите ссылку для записи, чтобы клиенты могли открыть профиль.",
    publicNote: "Опубликованное видит каждый, у кого есть ваша ссылка для записи. Черновики остаются приватными.",
    book: "Записаться на встречу", aboutNav: "Обо мне", bookingNav: "Запись", previewTitle: "Предпросмотр", close: "Закрыть", openDoc: "Открыть документ", format: "Формат",
  },
};

const TRANSLIT: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"h",ґ:"g",д:"d",е:"e",є:"ye",ж:"zh",з:"z",и:"y",і:"i",ї:"yi",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ь:"",ю:"yu",я:"ya",ё:"yo",ы:"y",э:"e",ъ:"",
};
/** Readable URL base from the therapist's name (Cyrillic transliterated, accents removed). */
export function profileSlugBase(p: Pick<TherapistProfileData, "first_name" | "last_name">): string {
  const raw = `${p.first_name} ${p.last_name}`.toLowerCase();
  const latin = Array.from(raw).map((ch) => TRANSLIT[ch] ?? ch).join("").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
  return latin.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}
export const profileUrl = (slug: string) => `https://solo-bizz.com/therapist/${slug}`;

const SHARE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-preview`;
/** Link that shows a personalized preview card in social apps, then opens the profile. */
export const profileShareUrl = (slug: string) => `${SHARE_BASE}?p=${encodeURIComponent(slug)}`;
/** Same for the public booking link. */
export const bookingShareUrl = (handle: string) => `${SHARE_BASE}?b=${encodeURIComponent(handle)}`;
