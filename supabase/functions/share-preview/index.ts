// Public share-preview page: returns HTML with personalized Open Graph tags for
// social crawlers, then forwards real visitors to the normal Solo .Bizz page.
// Data comes only from the same public RPCs the app uses (published profiles,
// active booking links), so nothing private can be exposed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE = "https://solo-bizz.com";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const anon = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const KEY = /^[a-zA-Z0-9_-]{1,80}$/;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const plain = (h: unknown) => String(h ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

const BOOK: Record<string, string> = {
  uk: "Запишіться на зустріч онлайн", en: "Book a meeting online", pl: "Umów spotkanie online",
  de: "Termin online buchen", fr: "Réservez un rendez-vous en ligne", ru: "Запишитесь на встречу онлайн",
};

type P = Record<string, unknown>;
async function photoUrl(p: P | null, fallback?: unknown): Promise<string | null> {
  const path = p && typeof p.photo === "string" ? p.photo : null;
  if (path) {
    const { data } = await admin.storage.from("therapist-profile-files").createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) return data.signedUrl;
  }
  return typeof fallback === "string" && fallback.startsWith("https://") ? fallback : null;
}
const nameOf = (p: P) => [p.first_name, p.patronymic, p.last_name].filter((x) => typeof x === "string" && x.trim()).join(" ").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const slug = u.searchParams.get("p");
  const token = u.searchParams.get("b");
  let target = SITE, title = "Solo .Bizz", desc = "", image: string | null = null, lang = "en";

  try {
    if (slug && KEY.test(slug)) {
      target = `${SITE}/therapist/${slug}`;
      const { data } = await anon.rpc("public_get_therapist_profile_by_slug", { p_slug: slug });
      const d = data as { profile?: P; language?: string } | null;
      if (d?.profile) {
        const p = d.profile;
        lang = d.language ?? "en";
        title = [nameOf(p), p.title].filter(Boolean).join(" — ") || title;
        desc = plain(p.about_html) || (Array.isArray(p.expertise) ? p.expertise.join(", ") : "");
        image = await photoUrl(p);
      }
    } else if (token && KEY.test(token)) {
      target = `${SITE}/book/${token}`;
      const [{ data: page }, { data: prof }] = await Promise.all([
        anon.rpc("public_get_booking_page", { p_token: token }),
        anon.rpc("public_get_therapist_profile", { p_token: token }),
      ]);
      const row = (Array.isArray(page) ? page[0] : page) as P | null;
      if (row?.is_active) {
        lang = String(row.language ?? "en");
        const p = (prof ?? null) as P | null;
        const name = (p && nameOf(p)) || String(row.display_name ?? row.business_name ?? "");
        title = [name, BOOK[lang] ?? BOOK.en].filter(Boolean).join(" — ");
        desc = (p && plain(p.about_html)) || [p?.title, row.business_name].filter(Boolean).join(" · ") || (BOOK[lang] ?? BOOK.en);
        image = await photoUrl(p, row.avatar_url);
      }
    }
  } catch (e) {
    console.error("share-preview", e);
  }

  title = clip(title, 90);
  desc = clip(desc || title, 200);
  const self = `${URL_}/functions/v1/share-preview${u.search}`;
  const img = image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:image" content="${esc(image)}">` : "";
  const html = `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="profile"><meta property="og:site_name" content="Solo .Bizz">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(self)}">${img}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<link rel="canonical" href="${esc(target)}"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head><body><script>location.replace(${JSON.stringify(target)})</script><a href="${esc(target)}">${esc(title)}</a></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
});
