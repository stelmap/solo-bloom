# Published localization QA — 21 November 2026

Verified on https://solo-bizz.com after the publication completed. All six landing paths now open their localized content rather than the previously observed 404.

## Method
- Chromium desktop and mobile viewport 390×844; this is mobile-browser emulation, not physical Safari/iPhone testing.
- Authenticated as the requesting user's account with real existing meetings, pending requests and published profile. No booking approved, email resent, review submitted, profile saved or booking settings changed.
- To avoid changing the account's saved language, each isolated browser context overrode only the language field of the profile GET response. Other profile fields and all appointment/booking data remained real. This verifies language rendering, not persistence of a language change.
- Screenshots inspected for all six languages; no page runtime errors observed.

## Results
| Area | Result |
|---|---|
| Landing | Ukrainian, German, English, Polish, French and Russian pages opened with localized titles and headings. |
| Calendar | Toolbar, weekday/month labels and booking-request counter localized in all six languages. Existing client names and user-entered service titles retain their original language. |
| Booking inbox panel | Ukrainian and English render correctly. German, Polish, French and Russian still contain English Booking inbox, pending, Approve, RECENTLY CONFIRMED, Confirmation email, Resend and English date/duration formatting. |
| Booking inbox page | Heading localized for Ukrainian, English, Polish and French; German and Russian retain Booking inbox. |
| Practice profile / booking-link settings | Labels, booking mode and availability translated in all six languages; clean same-origin /book/ URL displayed. Clipboard operation and saving were not exercised. |
| About me editor | Section headings and controls translated in all six languages. User-authored biography, education and other entered content remain as saved, not automatically translated. |
| Reviews | Public review dialog opened in all six languages with localized labels, consent and submission button. No review submitted; admin review moderation was outside this check. |
| Mobile booking preview | All six languages: localized date picker, weekdays, months, time-zone and duration labels; no horizontal page overflow. Cookie banner dismissed by rejecting optional cookies before final inspection. |
| Mobile About me preview | All six languages: localized navigation, headings and booking button. Saved biography remains Ukrainian across languages by design. |

## Findings for a separate correction
The remaining English booking-inbox panel labels in de/pl/fr/ru and page heading in de/ru require localization. This request was a verification task; no application translations were changed or republished.

## Boundaries
No payment, approval, email delivery, review submission or profile publishing flow was tested. Mobile verification covered published booking/profile previews, not every authenticated page on mobile. Initial crawler HTML/social validators were not re-audited in this application-screen check.