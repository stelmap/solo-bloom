// Shared Telegram helpers using the Lovable connector gateway.
export const TELEGRAM_GATEWAY = 'https://connector-gateway.lovable.dev/telegram';

export function getTelegramEnv() {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const tgKey = Deno.env.get('TELEGRAM_API_KEY');
  if (!lovableKey) throw new Error('LOVABLE_API_KEY is not configured');
  if (!tgKey) throw new Error('TELEGRAM_API_KEY is not configured');
  return { lovableKey, tgKey };
}

export async function tgFetch(path: string, body: unknown) {
  const { lovableKey, tgKey } = getTelegramEnv();
  const res = await fetch(`${TELEGRAM_GATEWAY}/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': tgKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(`Telegram ${path} failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function deriveTelegramWebhookSecret(): Promise<string> {
  const { tgKey } = getTelegramEnv();
  const data = new TextEncoder().encode(`telegram-webhook:${tgKey}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export const TELEGRAM_BOT_USERNAME = 'solobizzcontact';

// ---- Localization for outbound messages ----
export type Lang = 'en' | 'fr' | 'pl' | 'uk';
export function normalizeLang(value: unknown): Lang {
  const v = String(value || '').toLowerCase().slice(0, 2);
  if (v === 'fr' || v === 'pl' || v === 'uk') return v;
  return 'en';
}

type Dict = {
  reminder: (p: { client: string; specialist: string; date: string; time: string; type: string }) => string;
  confirmation: (p: { client: string; specialist: string; date: string; time: string; type: string }) => string;
  btnConfirm: string;
  btnReschedule: string;
  cbConfirmed: string;
  cbNoted: string;
  thanksConfirmed: string;
  thanksReschedule: string;
  welcomeNoToken: string;
  invalidToken: string;
  linkedSuccess: (name: string) => string;
};

const DICTS: Record<Lang, Dict> = {
  en: {
    reminder: (p) =>
      `Hello <b>${p.client}</b>,\n\nthis is a reminder about your session with <b>${p.specialist}</b>.\n\nDate: ${p.date}\nTime: ${p.time}\nType: ${p.type}\n\nPlease contact your therapist if you need to reschedule.`,
    confirmation: (p) =>
      `Hello <b>${p.client}</b>,\n\nplease confirm your upcoming session with <b>${p.specialist}</b>.\n\nDate: ${p.date}\nTime: ${p.time}\nType: ${p.type}\n\nPlease confirm your attendance.`,
    btnConfirm: '✅ Confirm session',
    btnReschedule: '🔄 I need to reschedule',
    cbConfirmed: 'Confirmed ✓',
    cbNoted: 'Noted',
    thanksConfirmed: 'Thank you. Your session has been confirmed.',
    thanksReschedule: 'Thank you. Your therapist has been notified that you may need to reschedule.',
    welcomeNoToken: 'Welcome! Please use the personalized link from your therapist to connect.',
    invalidToken: 'This invitation link is invalid or has expired. Please request a new one from your therapist.',
    linkedSuccess: (n) => `Hello ${n}! ✅ You are now connected. You will receive session reminders and confirmation requests here.`,
  },
  fr: {
    reminder: (p) =>
      `Bonjour <b>${p.client}</b>,\n\nceci est un rappel concernant votre séance avec <b>${p.specialist}</b>.\n\nDate : ${p.date}\nHeure : ${p.time}\nType : ${p.type}\n\nVeuillez contacter votre thérapeute si vous devez reporter.`,
    confirmation: (p) =>
      `Bonjour <b>${p.client}</b>,\n\nveuillez confirmer votre prochaine séance avec <b>${p.specialist}</b>.\n\nDate : ${p.date}\nHeure : ${p.time}\nType : ${p.type}\n\nMerci de confirmer votre présence.`,
    btnConfirm: '✅ Confirmer la séance',
    btnReschedule: '🔄 Je dois reporter',
    cbConfirmed: 'Confirmé ✓',
    cbNoted: 'Noté',
    thanksConfirmed: 'Merci. Votre séance est confirmée.',
    thanksReschedule: 'Merci. Votre thérapeute a été informé que vous souhaitez reporter.',
    welcomeNoToken: 'Bienvenue ! Veuillez utiliser le lien personnalisé envoyé par votre thérapeute pour vous connecter.',
    invalidToken: 'Ce lien d\'invitation est invalide ou expiré. Veuillez en demander un nouveau à votre thérapeute.',
    linkedSuccess: (n) => `Bonjour ${n} ! ✅ Vous êtes maintenant connecté. Vous recevrez ici les rappels et demandes de confirmation.`,
  },
  pl: {
    reminder: (p) =>
      `Cześć <b>${p.client}</b>,\n\nto przypomnienie o sesji z <b>${p.specialist}</b>.\n\nData: ${p.date}\nGodzina: ${p.time}\nTyp: ${p.type}\n\nSkontaktuj się z terapeutą, jeśli musisz przełożyć spotkanie.`,
    confirmation: (p) =>
      `Cześć <b>${p.client}</b>,\n\npotwierdź proszę nadchodzącą sesję z <b>${p.specialist}</b>.\n\nData: ${p.date}\nGodzina: ${p.time}\nTyp: ${p.type}\n\nProszę o potwierdzenie obecności.`,
    btnConfirm: '✅ Potwierdź sesję',
    btnReschedule: '🔄 Muszę przełożyć',
    cbConfirmed: 'Potwierdzono ✓',
    cbNoted: 'Zapisano',
    thanksConfirmed: 'Dziękujemy. Sesja została potwierdzona.',
    thanksReschedule: 'Dziękujemy. Terapeuta został powiadomiony, że możesz potrzebować przełożenia.',
    welcomeNoToken: 'Witamy! Aby się połączyć, użyj spersonalizowanego linku od swojego terapeuty.',
    invalidToken: 'Ten link zaproszenia jest nieprawidłowy lub wygasł. Poproś terapeutę o nowy.',
    linkedSuccess: (n) => `Cześć ${n}! ✅ Jesteś już połączony/a. Tutaj będziesz otrzymywać przypomnienia i prośby o potwierdzenie sesji.`,
  },
  uk: {
    reminder: (p) =>
      `Вітаємо, <b>${p.client}</b>,\n\nце нагадування про сеанс із <b>${p.specialist}</b>.\n\nДата: ${p.date}\nЧас: ${p.time}\nТип: ${p.type}\n\nЗв'яжіться з терапевтом, якщо потрібно перенести.`,
    confirmation: (p) =>
      `Вітаємо, <b>${p.client}</b>,\n\nбудь ласка, підтвердіть найближчий сеанс із <b>${p.specialist}</b>.\n\nДата: ${p.date}\nЧас: ${p.time}\nТип: ${p.type}\n\nПідтвердіть свою присутність.`,
    btnConfirm: '✅ Підтвердити сеанс',
    btnReschedule: '🔄 Потрібно перенести',
    cbConfirmed: 'Підтверджено ✓',
    cbNoted: 'Враховано',
    thanksConfirmed: 'Дякуємо. Ваш сеанс підтверджено.',
    thanksReschedule: 'Дякуємо. Терапевта повідомлено, що вам може знадобитися перенесення.',
    welcomeNoToken: 'Вітаємо! Скористайтеся персональним посиланням від вашого терапевта, щоб під\'єднатися.',
    invalidToken: 'Це посилання-запрошення недійсне або застаріло. Попросіть терапевта надіслати нове.',
    linkedSuccess: (n) => `Вітаємо, ${n}! ✅ Вас під'єднано. Тут ви отримуватимете нагадування та запити підтвердження сеансів.`,
  },
};

export function tg(lang: Lang | string | undefined): Dict {
  return DICTS[normalizeLang(lang)];
}

const LOCALE_MAP: Record<Lang, string> = { en: 'en-US', fr: 'fr-FR', pl: 'pl-PL', uk: 'uk-UA' };
export function formatSessionDateTime(iso: string, lang: Lang | string | undefined) {
  const l = LOCALE_MAP[normalizeLang(lang)];
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(l, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time: d.toLocaleTimeString(l, { hour: '2-digit', minute: '2-digit' }),
  };
}
