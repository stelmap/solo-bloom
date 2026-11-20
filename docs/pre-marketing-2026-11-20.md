# Pre-marketing corrections — 20 November 2026

## Completed
- Existing product calendar screenshots retain their layout and event positions, with neutral names, translated controls/service labels, Ukrainian «лист.» and 3 outstanding meetings.
- Interactive visitor-local demo also has exactly 3 outstanding meetings; real calendars and billing remain untouched.
- Registration home links and welcoming text translated across six languages.
- Pro now says it includes the Solo plan; footer shows a brand mission and owner-confirmed Instagram.
- Owner-authorized profile cleanup removed only the reported certificate caption and replaced PSU with «Психологиня, клінічна психологія». Both draft and published content were corrected; public read-back verified.
- Landing now reads the real published profile and permitted photo through the existing public interface, never drafts. Only one real profile is shown until more consenting specialists are available.
- Single approved review is centered; no fabricated reviews, photographs, endorsements, or usage totals were added.
- EU database location confirmed in hosted information (eu-west-1). The new statement refers only to client records, not all processing/services or guaranteed legal compliance.
- Six 1200×630 preview images use brand colors and localized headline, attached to rendered home-page metadata.
- Existing distinct `?lang=uk/en/pl/de/fr/ru` pages, six reciprocal hreflang alternatives and canonical URLs checked. No alternate sitemap mechanism or duplicate language paths introduced.
- UTM source/campaign retention now survives navigation to registration after analytics consent, and is cleared on withdrawal. Only five allow-listed campaign fields are stored.

## Campaign links for outgoing posts/bios
Instagram: https://solo-bizz.com/?lang=uk&utm_source=instagram&utm_medium=social&utm_campaign=profile_launch&utm_content=bio

Threads: https://solo-bizz.com/?lang=uk&utm_source=threads&utm_medium=social&utm_campaign=profile_launch&utm_content=post

Use `lang=pl`, `fr`, `ru`, `de` or `en` for the corresponding campaign. These go from a social post to the website; footer links remain direct links to the official social account.

## Verification
- 17 tests passed: demo (8), campaign attribution (5), public language URLs (4).
- Browser checked six languages, calendar images, real public profile preview, metadata and hreflang; signup CTA → localized return-to-home; demo day/week/month buttons and meeting dialog.
- Owner-session update confirmed only the selected owner profile; anonymous public profile read-back confirmed the requested title and no test caption.
- Desktop and 390px mobile checked without horizontal page overflow.
- Vite has no Lovable media proxy. Local browser checks resolved only immutable asset URLs using the published site's asset handler and verified actual image pixels. This does not change application behavior.
- Current preview build is successful. No real signup, booking, payment or external social-network cache test was submitted.

## Pending, not presented as completed
- Official Threads URL.
- Additional genuine testimonials, city/photo permissions and public specialist profiles.
- Approved non-test usage statistic.
- SSR/prerender and same-domain personalized social previews require the separate framework update decision. React-generated metadata is still not a server-rendered document for non-JavaScript crawlers; prepared cards do not solve that limitation by themselves.
- No framework migration, hosting rewrite, or new helper sharing endpoint was deployed. Copy/Preview booking URL behavior remains intact.
- Website changes require publishing; profile-content cleanup is already stored in the live owner's profile.

Image preparation followed the Media CLI asset workflow; existing screenshots were edited locally rather than generated or redesigned.