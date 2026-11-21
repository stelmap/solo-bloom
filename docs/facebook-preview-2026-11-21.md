# Facebook landing preview diagnosis — 21 November 2026

## Confirmed root cause

The production host serves the same static English root document for `/` and `/?lang=uk`. All four user agents tested received HTTP 200 without a redirect: browser, `facebookexternalhit/1.1`, `Facebot`, and a non-JavaScript client. JavaScript redirects a human visitor from `/?lang=uk` to `/uk/`; Facebook does not execute this redirect and reads the English document instead. This is not evidence of a font or encoding failure, nor evidence of user-agent-specific delivery.

`src/lib/landingRoutes.ts` implements the browser-only legacy redirect; `RedesignedLanding.tsx` invokes it in an effect. `scripts/landing-prerender-plugin.ts` emits one root document plus six localized path documents. Static hosting chooses by path, not language query. The plugin can render a query-aware response in development, but the deployed static root cannot do that. No supported `_redirects` or `_headers` configuration can fix query routing on this host.

Resolving the legacy URL for non-JavaScript crawlers requires a real request-level redirect preserving campaign parameters. This remains blocked on hosting capability; no unrelated framework migration or ineffective redirect file was added. Existing browser links were preserved, and the English root was not changed into Ukrainian.

## Production response before this change

All six language paths returned HTTP 200, `text/html; charset=utf-8`, correct initial document language, one canonical, and localized Open Graph tags. The response did not depend on the tested user agent.

For `/?lang=uk`:
- Document language: `en`
- Title and Open Graph title: `Solo .Bizz — Everything you need for your private practice — in one system.`
- Canonical and Open Graph URL: `https://solo-bizz.com/en/`
- Image: `https://solo-bizz.com/__l5e/assets-v1/a694aa13-6421-4492-a6e8-c480588e6b1f/brand-share-en.jpg`

For `/uk/`:
- Document language: `uk`
- Title and Open Graph title: `Solo .Bizz — Усе необхідне для вашої приватної практики — в одній системі.`
- Canonical and Open Graph URL: `https://solo-bizz.com/uk/`
- Previous image: `https://solo-bizz.com/__l5e/assets-v1/e26a653a-2f4c-4a5c-88a0-45273e858583/brand-share-uk.jpg`

The previous Ukrainian image was a valid navy/orange brand card with readable Cyrillic. It did not match the actual current first-screen headline/layout. Its mapping lived in `src/lib/brandPreview.ts` and the `brand-share-*.jpg.asset.json` pointers. No missing glyphs or double-encoded text were observed in that image.

## Change

Replaced only the six landing share-image pointers with versioned browser captures of the actual shared first screen. All are 1200×630 PNGs, approximately 96–176 KB, captured after fonts loaded. The existing layout, translated headline, supporting copy and buttons are unchanged. Current screenshot content is used; no invented product details or arbitrary HTML-to-text-box conversion was introduced.

The new public image addresses are recorded below after upload. The immutable filenames and asset identifiers avoid reusing the old image URL. These changes do not fix legacy query-based HTML delivery.

## Verification and limits

- 32 production raw HTML requests compared: eight URLs × four user agents.
- Six new images visually inspected; Cyrillic and Latin accents are readable, headlines fit.
- All six initial preview HTML documents contain one correct image, one self-referencing canonical, localized document language, and 1200×630 dimensions before JavaScript.
- Five language-route tests passed.
- An existing unrelated pricing-copy comparison has two failures because its legacy text says “sessions” while current app text says “meetings”; no pricing, subscription, or terminology changes were made for this task.
- Basic security recheck found no issues in its covered checks; it did not run deep code analysis.
- Normal production browser navigation from `/?lang=uk` reached `/uk/`.
- Facebook Sharing Debugger was opened, but displayed “Log into Facebook to use this tool.” No authenticated Facebook session is available, so “Scrape Again” and Facebook's resulting card remain unverified. Browser user-agent probes are not a Facebook cached-preview verification.

## Acceptance status

- AC1: production browser legacy link reaches the correct Ukrainian page.
- AC2: NOT VERIFIED — actual Facebook cached card requires authenticated Debugger.
- AC3–4: new screenshot assets match the real navy/orange first screen and contain readable text.
- AC5: production browser click destination works; actual Facebook card click was not exercised.
- AC6: PASS for `/uk/`; FAIL for legacy `/?lang=uk` until request-level routing exists.
- AC7: six localized paths tested in raw production HTML and new preview HTML.
- AC8: code changes affect only share-image mapping; signup/payment actions were not exercised.

This task is not DONE. Use `https://solo-bizz.com/uk/` for Ukrainian sharing while request-level legacy redirect support remains unavailable. Facebook's old scrape can only be refreshed after publishing and through an authorised Facebook session.

### Publication check

Publication was requested. A subsequent direct check of all six production language pages still returned the previous `brand-share-*.jpg` image URLs, so deployment completion is not confirmed. The old legacy query still returned English. Do not attribute this to Facebook cache: the new metadata has not yet been confirmed on the live site itself.
## Exact new image URLs

- uk: https://solo-bizz.com/__l5e/assets-v1/448d19ef-cf3a-4d10-9539-4bdef4b140d2/landing-hero-share-uk-20261121.png
- en: https://solo-bizz.com/__l5e/assets-v1/da4f5b16-ca93-45ef-97ef-1a9742753c68/landing-hero-share-en-20261121.png
- pl: https://solo-bizz.com/__l5e/assets-v1/e94cbdc7-0cd6-47fc-9dc4-874c542fb531/landing-hero-share-pl-20261121.png
- de: https://solo-bizz.com/__l5e/assets-v1/0adfffdb-ca61-4b79-834a-e50cfcde2417/landing-hero-share-de-20261121.png
- fr: https://solo-bizz.com/__l5e/assets-v1/cfa5a49b-54cd-409a-aa7a-bfabc43f790a/landing-hero-share-fr-20261121.png
- ru: https://solo-bizz.com/__l5e/assets-v1/e82898c0-e8df-4b3e-84b1-f00454833fa3/landing-hero-share-ru-20261121.png

## Exact initial Ukrainian Open Graph description

Календар, клієнти, онлайн-запис, оплати та публічний профіль для приватної практики. Solo від €12/місяць, Pro €24/місяць. 14 днів безплатно без картки.

The legacy query returns the English description instead:

Calendar, clients, online booking, payments and a public profile for your private practice. Solo €12/month, Pro €24/month. Try 14 days free without a card.
