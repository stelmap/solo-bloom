// Runs before build: refreshes the specialist-profile block in public/sitemap.xml
// from the public list of published profiles. Static entries are kept as-is.
import { readFileSync, writeFileSync } from "fs";
const FILE = "public/sitemap.xml", START = "<!-- therapist-profiles:start -->", END = "<!-- therapist-profiles:end -->";
const env = Object.fromEntries(readFileSync(".env", "utf8").split("\n").map((l) => l.match(/^(\w+)="?([^"]*)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
let xml = readFileSync(FILE, "utf8");
try {
  const r = await fetch(`${url}/rest/v1/rpc/public_list_therapist_profile_slugs`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const rows = await r.json();
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const block = [START, ...rows.filter((x) => /^[a-z0-9-]+$/i.test(x.slug)).map((x) => `  <url>\n    <loc>https://solo-bizz.com/therapist/${esc(x.slug)}</loc>${x.published_at ? `\n    <lastmod>${x.published_at.slice(0, 10)}</lastmod>` : ""}\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`), `  ${END}`].join("\n");
  xml = xml.includes(START) ? xml.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block) : xml.replace("</urlset>", `  ${block}\n</urlset>`);
  writeFileSync(FILE, xml);
  console.log(`sitemap: ${rows.length} therapist profiles`);
} catch (e) { console.warn("sitemap: kept existing profile list:", e.message); }
