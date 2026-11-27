// Builds the display context shared by meeting-status emails. Appointment and
// request timestamps are practice wall clocks labelled UTC, so they are
// formatted in UTC and paired with the practice timezone name.
import { WEBSITE_URL } from './email-templates/welcome-content.ts'

const LOC: Record<string, string> = { uk: 'uk-UA', en: 'en-GB', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR', ru: 'ru-RU' }
export const isLang = (v: unknown): v is string => typeof v === 'string' && v in LOC

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`

export function formatSlot(slotIso: string, lang: string) {
  const slot = new Date(slotIso)
  const loc = LOC[lang] ?? 'en-GB'
  const date = slot.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const weekday = slot.toLocaleDateString(loc, { weekday: 'long', timeZone: 'UTC' })
  return {
    sessionDate: `${date}, ${weekday}`,
    sessionTime: slot.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
  }
}

export function googleCalendarUrl(slotIso: string, minutes: number, title: string, timezone?: string | null) {
  const start = new Date(slotIso)
  const end = new Date(start.getTime() + Math.max(1, minutes || 50) * 60000)
  const u = new URL('https://calendar.google.com/calendar/render')
  u.searchParams.set('action', 'TEMPLATE')
  u.searchParams.set('text', title)
  u.searchParams.set('dates', `${stamp(start)}/${stamp(end)}`)
  if (timezone) u.searchParams.set('ctz', timezone)
  return u.href
}

/** Owner display data; `db` must be allowed to read the owner's profile and booking link. */
export async function ownerContext(db: any, ownerId: string, lang: string) {
  const [{ data: owner }, { data: link }] = await Promise.all([
    db.from('profiles').select('full_name, business_name, language, timezone, default_duration').eq('user_id', ownerId).maybeSingle(),
    db.from('booking_links').select('token, is_active').eq('user_id', ownerId).maybeSingle(),
  ])
  const handle = link?.is_active ? link.token : null
  return {
    specialistName: (owner?.full_name || owner?.business_name || undefined) as string | undefined,
    timezone: (owner?.timezone || undefined) as string | undefined,
    duration: Number(owner?.default_duration) || 50,
    ownerLanguage: owner?.language as string | undefined,
    bookingUrl: handle ? `${WEBSITE_URL}/book/${encodeURIComponent(handle)}?lang=${lang}` : undefined,
  }
}
