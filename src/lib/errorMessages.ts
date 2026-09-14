import { AppLanguage, getActiveLang } from "@/i18n/translations";
import { translateFor, getStoredLang } from "@/i18n/LanguageContext";

/**
 * Central error localization.
 *
 * Raw provider errors (Supabase, Postgres, Stripe, network failures) are
 * technical and always English. Everything user-facing must go through
 * `describeError`, which maps the raw error onto a translation key and renders
 * it in the language the UI is currently using. English is the safe fallback.
 */

type Key = string;

/** Postgres / PostgREST / Supabase auth codes → translation keys. */
const CODE_KEYS: Record<string, Key> = {
  "23505": "errors.crud.duplicate",
  "23503": "errors.general.conflict",
  "23514": "errors.general.invalidInput",
  "22P02": "errors.general.invalidInput",
  "42501": "errors.general.permissionDenied",
  "PGRST301": "errors.general.sessionExpired",
  "PGRST116": "errors.general.notFound",
  invalid_credentials: "errors.auth.invalidCredentials",
  email_not_confirmed: "errors.auth.emailNotConfirmed",
  user_already_exists: "errors.auth.emailAlreadyExists",
  email_exists: "errors.auth.emailAlreadyExists",
  weak_password: "errors.auth.weakPassword",
  over_request_rate_limit: "errors.auth.tooManyAttempts",
  otp_expired: "errors.auth.expiredOtp",
  signup_disabled: "errors.auth.signUpDisabled",
  session_expired: "errors.general.sessionExpired",
  SESSION_EXPIRED: "errors.general.sessionExpired",
};

/** Message patterns → translation keys, checked in order. */
const MESSAGE_KEYS: Array<[RegExp, Key]> = [
  [/session[_\s]?expired|jwt expired|invalid (jwt|claim)|refresh token/i, "errors.general.sessionExpired"],
  [/row-level security|permission denied|not authorized|unauthorized|forbidden/i, "errors.general.permissionDenied"],
  [/invalid login credentials|incorrect (email|password)/i, "errors.auth.invalidCredentials"],
  [/email not confirmed|confirm your email/i, "errors.auth.emailNotConfirmed"],
  [/user already registered|already registered|already exists.*email|duplicate key.*email/i, "errors.auth.emailAlreadyExists"],
  [/user not found|no user found/i, "errors.auth.userNotFound"],
  [/password should be at least|password is too short/i, "errors.auth.passwordTooShort"],
  [/passwords? do not match/i, "errors.auth.passwordMismatch"],
  [/token has expired|otp.*expired|code.*expired|expired.*(code|token|link)/i, "errors.auth.expiredOtp"],
  [/invalid (otp|token|code)|token.*invalid/i, "errors.auth.invalidOtp"],
  [/password.*weak|weak password/i, "errors.auth.weakPassword"],
  [/signups? (are )?(not allowed|disabled)/i, "errors.auth.signUpDisabled"],
  [/unsupported provider|oauth|provider.*error/i, "errors.auth.oauthFailed"],
  [/rate limit|too many requests|too many attempts/i, "errors.general.rateLimited"],
  [/duplicate key value|unique constraint/i, "errors.crud.duplicate"],
  [/failed to fetch|networkerror|network request failed|err_internet|offline/i, "errors.general.network"],
  [/timeout|timed out|aborted/i, "errors.general.timeout"],
  [/invalid email/i, "errors.validation.invalidEmail"],
  [/\b(5\d{2})\b|internal server error|service unavailable|upstream/i, "errors.general.server"],
  [/not found|does not exist|no rows/i, "errors.general.notFound"],
  [/violates|constraint|invalid input syntax|sql|postgres|supabase/i, "errors.general.unknown"],
];

interface RawError {
  message?: unknown;
  error_description?: unknown;
  error?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  status?: unknown;
  name?: unknown;
}

function readRaw(err: unknown): { text: string; code: string } {
  if (err == null) return { text: "", code: "" };
  if (typeof err === "string") return { text: err, code: "" };
  const e = err as RawError;
  const parts = [e.message, e.error_description, typeof e.error === "string" ? e.error : undefined, e.details, e.hint]
    .filter((v) => typeof v === "string" && v)
    .join(" ");
  const code = typeof e.code === "string" || typeof e.code === "number" ? String(e.code) : "";
  const status = typeof e.status === "number" ? String(e.status) : "";
  return { text: parts || String(err), code: code || status };
}

/** Resolve the translation key for a raw error, or null when nothing matches. */
export function errorKeyFor(err: unknown): Key | null {
  const { text, code } = readRaw(err);
  if (code && CODE_KEYS[code]) return CODE_KEYS[code];
  if (code === "401" || code === "403") return "errors.general.permissionDenied";
  if (code === "404") return "errors.general.notFound";
  if (code === "429") return "errors.general.rateLimited";
  if (code.startsWith("5")) return "errors.general.server";
  if (!text) return null;
  for (const [re, key] of MESSAGE_KEYS) {
    if (re.test(text)) return key;
  }
  return null;
}

const looksLikeKey = (value: string) => /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(value);

function currentLang(): AppLanguage {
  const active = getActiveLang();
  return active || getStoredLang();
}

/**
 * Turn any thrown value into a short, localized, user-friendly message.
 *
 * @param err      the caught error (Error, Supabase error, string, unknown)
 * @param fallback translation key ("errors.crud.saveFailed") or ready text
 *                 used when the error can't be mapped to a known cause
 * @param lang     override the language (defaults to the active UI language)
 */
export function describeError(
  err: unknown,
  fallback: string = "errors.general.unknown",
  lang?: AppLanguage,
): string {
  // Technical details stay in the console for debugging; users never see them.
  if (err != null) {
    try {
      console.error("[error]", err);
    } catch {
      /* noop */
    }
  }
  const language = lang ?? currentLang();
  const key = errorKeyFor(err);
  if (key) return translateFor(language, key);
  return looksLikeKey(fallback) ? translateFor(language, fallback) : fallback;
}

/** Localized text for a known error key (never returns the key itself). */
export function errorText(key: Key, lang?: AppLanguage): string {
  return translateFor(lang ?? currentLang(), key);
}
