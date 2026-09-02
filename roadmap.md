# Roadmap

## Support Ukrainian Psychotherapists campaign (50% off Solo & Pro)
- [x] Campaign source of truth (`src/lib/supportUkraine.ts`) + eligibility hook
- [x] Analytics events
- [x] Banner, price display, promo input components
- [x] Landing page banner + discounted pricing
- [x] Plans page pricing, promo panel, checkout hint, tracking
- [x] Server-side eligibility + coupon applied once in `create-checkout` (no stacking)
- [x] Billing settings campaign block (status, plan, discounted renewal, notice)
- [x] Conversion tracking on purchase success
- [x] Stripe coupon + promotion code (live), `promotions` row registered

## Other
- [x] BETA label next to SoloBizz in the sidebar

- [x] Session payment: allocate payment to the closed session first, then older debts
- [x] Group session closing flow/UI matches single-session one-click bar

## Hero slider (landing)
- [x] Arrows overlaid on left/right edges of the screenshot (no arrow row below)
- [x] Remove small preview thumbnails from the overview slide
- [x] Tabs, arrows, dots and counter drive one shared slide state
- [x] Fluid hero layout (no fixed px), aspect-ratio screenshot, no horizontal scroll
