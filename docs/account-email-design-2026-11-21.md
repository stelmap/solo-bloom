# Remaining account email presentation

The password reset, invitation, sign-in link, email change and identity-code emails now use the welcome email's light lavender/peach palette, dark branding/headings, compact spacing, solid orange action buttons and linked support/site footer. Symbol icons are omitted to avoid font-dependent broken glyphs. Identity verification stays code-only; no unrelated button or video destination was added.

Localized in Ukrainian, English, Polish, German, French and Russian. German account-email translations now replace the previous English fallback. Existing translations for other languages, per-event security warnings and SDK delivery/verification logic remain unchanged. Transactional booking, cancellation and administrative messages are outside this account-email update.

## Verification
- Deno regression suites: 5 passed, covering supplied action destinations, leading-zero verification codes, old/new email addresses, German language recognition and welcome Unicode preservation.
- Browser HTML previews: 30 messages at desktop and phone sizes (60 cases), no horizontal overflow or Unicode replacement characters; sample sign-in action opens its supplied URL in a new tab.
- Visually reviewed Ukrainian phone variants and German desktop email-change message; headings use dark text on light backgrounds.
- Existing `auth-email-hook` deployed. Latest application preview build: OK.

These checks do **not** verify delivered MIME, Gmail/Outlook/Apple Mail rendering or real password changes/account activation. Native **Send test** in **More → Emails** and actual mailbox evidence remain required. No messages were sent by this update. Sender configuration and website publication were not changed.