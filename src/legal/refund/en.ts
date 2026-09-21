import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

export const refundEn: LegalDoc = {
  back: "Back to home",
  title: "Refund Policy",
  updated: LEGAL_LAST_UPDATED.en,
  intro:
    "This Refund Policy explains when you can cancel a Solo .Bizz subscription, when you can get your money back, and how to request a refund.",
  sections: [
    {
      h: "1. Who you pay",
      body: [
        "Solo .Bizz is operated by **individual entrepreneur Olha Volodymyrivna Stelmakh**, registered in Lviv, Ukraine. Contact: info@solo-bizz.com.",
        "All payments are processed by **Paddle.com Market Ltd**, which acts as Merchant of Record and reseller of the service. Paddle appears on your bank or card statement and issues your invoice.",
        "Questions about a payment or refund: info@solo-bizz.com.",
      ],
    },
    {
      h: "2. Free plan and trial use",
      body: [
        "Solo .Bizz has a free plan with no card required. We recommend using it to check that the service fits your practice before you pay.",
      ],
    },
    {
      h: "3. 14-day right of withdrawal (EU/EEA and UK consumers)",
      body: [
        "If you are a consumer in the EU/EEA or the UK, you may withdraw from the purchase within 14 days of the payment date without giving a reason, and we will refund it in full.",
        "The service starts immediately after payment so you can use it at once. Where the law allows us to deduct an amount for the part of the period already used, we normally choose not to and refund the full amount.",
      ],
    },
    {
      h: "4. Refunds outside the 14-day period",
      body: [
        "Subscriptions renew automatically. After the 14-day period, payments for a started billing period are generally non-refundable, because access to the service remains available for the whole period you paid for.",
        "We will still refund, in full or pro rata, in these cases:",
        [
          "a technical fault on our side made the service unusable for a significant time and we could not fix it;",
          "you were charged twice or charged after cancelling;",
          "an annual or quarterly plan was renewed and you contact us within 14 days of the renewal charge without having used the new period;",
          "any other case where a refund is required by applicable consumer law.",
        ],
      ],
    },
    {
      h: "5. Cancelling a subscription",
      body: [
        "You can cancel at any time from Settings in the app, or by writing to info@solo-bizz.com.",
        "Cancelling stops future charges. Your paid access continues until the end of the period you already paid for, and your data stays available to you until then.",
      ],
    },
    {
      h: "6. How to request a refund",
      body: [
        "Write to info@solo-bizz.com from the email address of your account and include the payment date, the amount, and a short description of the reason. No special form is required.",
        "We reply within 5 business days. Approved refunds are issued by Paddle to the original payment method, usually within 5-10 business days depending on your bank.",
      ],
    },
    {
      h: "7. Discounts and promotional prices",
      body: [
        "Refunds are calculated on the amount actually paid, including any discount or promo code applied at checkout.",
      ],
    },
    {
      h: "8. Chargebacks",
      body: [
        "Please contact us before opening a dispute with your bank — almost every issue is resolved faster directly. Accounts with an open chargeback may be suspended until it is settled.",
      ],
    },
    {
      h: "9. Changes to this policy",
      body: [
        "We may update this Refund Policy as the product and legal requirements evolve. The date at the top shows the current version; the policy in force when you paid applies to that payment.",
      ],
    },
    {
      h: "10. Contact",
      body: [
        "Questions about refunds and billing: info@solo-bizz.com.",
        { type: "link", to: "/terms", label: "Terms and Conditions" },
      ],
    },
  ],
};
