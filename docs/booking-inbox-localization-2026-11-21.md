# Booking inbox localization correction — 21 November 2026

## Published-site verification
- Checked `https://solo-bizz.com/booking-inbox` and Calendar → Booking requests in Ukrainian, German, English, Polish, French and Russian, signed in as the requesting user.
- Confirmed the existing English fallback in the German/Russian page and German/Polish/French/Russian panel.

## Correction
- Both views now use the existing shared application dictionaries in all six languages.
- Localized headings, counts, statuses, actions, email delivery/retry labels, client-linking/creation dialogs, confirmation dialogs and notifications.
- Ukrainian confirmation button now reads “Підтвердити запис”; the inbox heading reads “Вхідні запити”.
- Panel dates use the selected interface language while retaining UTC-labelled practice wall-clock hours.
- No request, approval, email delivery, client creation or booking logic changed.

## Verification
- Chromium checked all six published language views and all six corrected localhost views with real existing requests, including opening the confirmation dialog without submitting it.
- One real pending request and recent confirmed requests were visible throughout; zero page runtime errors in all twelve contexts. Screenshots inspected for all six corrected panels and the Ukrainian confirmation dialog.
- Language overridden only in browser profile GET responses; account preferences and booking records were not changed. No approval, resend, decline or save was submitted.
- 18 existing tests passed across language persistence, language modes and time formatting. Existing test act warning remains; no failed tests. Preview build reports OK.
- An unrelated stale Vite optimized-dependency cache initially blanked localhost; cleared that temporary cache and restarted the supervised preview. Subsequent signed-in checks passed.

## Deployment
Corrections remain in preview until the owner approves publication. The published site was checked for the original problem, not the corrected deployment. Physical Safari/macOS and mobile inbox layout were outside this request.