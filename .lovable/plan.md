# New subscription rules, then the landing redesign

## 1. Subscription rules

Apply the new offer to accounts created after the rollout:

- **Solo — €12/month:** Dashboard, Calendar, Clients, Payments, Services, Public Booking Link and unlimited clients.
- **Pro — €24/month:** everything in Solo plus Groups, Supervision, advanced Finance, Income and Expenses, Payment Audit, Invoice Registry, Break-even Analysis and Financial Settings.
- **14-day trial:** access to all released Pro features, once per new account, starting after email confirmation. No card required and no automatic charge. Choosing a paid subscription opens the existing Paddle checkout.
- After the trial expires without payment, preserve all records and allow viewing/exporting existing data; require a paid plan for new entries or changes. Keep account settings and billing accessible.
- Professional Public Page and Document Management remain clearly marked **Coming soon**, not included as released functionality.

### Protect existing customers

- Preserve existing accounts' current access, client records, payments, subscriptions and personal recurring discounts; do not restart trials or downgrade existing customers automatically.
- Keep existing quarterly/yearly billing options and prices unchanged. The redesigned landing highlights the requested monthly prices.
- Keep historical invoices and referral rewards unchanged. Trial access is not a paid subscription and produces no referral commission.
- Do not change Paddle's environment or run real payments during testing.

## 2. Landing page

- Compact sticky header with Features, How It Works, Pricing, What's New, Log In and trial CTA; compact mobile navigation and all five language choices.
- Replace the existing collage with the requested concise headline and supporting text, trial/pricing buttons, and a large genuine Calendar screenshot with fictional sample data.
- Interactive Calendar, Clients, Payments and Dashboard tabs with a stable screenshot frame, concise value/benefit copy and accessible image enlargement.
- Three-step workflow and a realistic public-booking preview, clearly separate from the planned Professional Public Page.
- Only two paid pricing cards, Solo and Pro; show the trial as a temporary introduction, not a third plan. Add a collapsible comparison matching the implemented access rules.
- Six concise expandable FAQ answers, existing legal/contact information, and verified social links only. Do not invent an Instagram address if no verified account can be found.
- Separate What's New page with Released, In Progress and Planned sections; publish dates only when confirmed.
- Fully localized Ukrainian, English, Polish, French and Russian copy and valid title, description, canonical and language metadata.

## 3. Analytics and verification

- Reuse existing privacy-aware analytics, with a redesign version marker for before/after comparison.
- Track page and pricing views, hero CTA, preview tabs, screenshot expansion, booking-preview interaction and registration start/completion.
- Add concrete tests for the €12/€24 offer, unlimited clients, exact 14-day expiry, one trial per account, plan-specific access and preserved legacy access.
- Check signup → email confirmation → trial access; expiry → retained records → paid-plan prompt; and paid access without performing a real money transfer.
- Check landing navigation, all preview tabs, lightbox, pricing comparison, FAQ, registration CTA and layouts on desktop, tablet and mobile.

## Technical approach

- Introduce a server-authoritative versioned access policy, keeping trial grants separate from Paddle subscription state and preserving existing accounts through a recorded legacy policy.
- Use additive database changes, explicit grants and owner-scoped policies. Enforce restricted writes on the server as well as the interface; UI hiding alone is insufficient.
- Resolve plans from the existing plan/price mapping, including Paddle IDs; remove new-policy reliance on old hardcoded price IDs and unconditional financial access.
- Update registration, entitlement reads, subscription synchronization, client-limit checks and restricted module access together so the landing promise matches real behavior.
- Keep public redesign components and localized copy isolated from the authenticated workspace. Capture genuine product screens with anonymized sample data; never publish actual client or contact information.

## Rollout order

1. Implement and verify subscription rules and existing-customer protections.
2. Implement the landing redesign against those verified rules.
3. Finish end-to-end checks before publishing.