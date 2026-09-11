import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

// TODO (administrator): confirm and insert (a) the legal entity name, address
// and registration details of the Solo .Bizz operator in section 1, and
// (b) the governing law and competent courts in section 16. These are not
// available in the project configuration and must not be invented.

export const termsEn: LegalDoc = {
  back: "Back to home",
  title: "Terms & Conditions",
  updated: LEGAL_LAST_UPDATED.en,
  intro:
    "These Terms & Conditions govern your use of the Solo .Bizz website and application. Please read them before creating an account.",
  sections: [
    {
      h: "1. Who provides the service",
      body: [
        "Solo .Bizz is operated by the Solo .Bizz operator, reachable at info@solo-bizz.com.",
        "**Note for completeness:** the full legal entity details will be published here once formally confirmed.",
        "By creating an account or using Solo .Bizz you accept these Terms. If you do not accept them, please do not use the service.",
      ],
    },
    {
      h: "2. What Solo .Bizz is",
      body: [
        "Solo .Bizz is a software service that helps independent professionals run their practice. Depending on your plan, it can include:",
        [
          "client records and practice history;",
          "calendar and session scheduling, including public booking pages;",
          "session notes and documents;",
          "agreements and consent collection;",
          "payment status tracking and financial overview;",
          "notifications and reminders;",
          "reports and analytics about your own practice.",
        ],
        "Solo .Bizz is an organisational tool. It does not provide psychological, medical, legal, accounting or tax services, and it does not supervise or verify your professional work.",
      ],
    },
    {
      h: "3. Accounts and eligibility",
      body: [
        "You must be at least 18 years old and legally able to enter into a contract.",
        [
          "you must provide accurate registration information and keep it up to date;",
          "you are responsible for keeping your login credentials confidential;",
          "you are responsible for activity that happens under your account;",
          "one account is intended for one professional, unless a plan explicitly allows more users;",
          "you must inform us promptly of any suspected unauthorised use.",
        ],
        "We may suspend or close accounts that are used in breach of these Terms.",
      ],
    },
    {
      h: "4. Your professional responsibility",
      body: [
        "You remain fully responsible for your professional practice, including the quality and legality of your services, your professional qualifications and licences, your professional and ethical obligations, your relationship with your clients, and your tax and accounting duties.",
        "Solo .Bizz is a tool you use in your practice, not a party to your relationship with your clients.",
      ],
    },
    {
      h: "5. Plans and pricing",
      body: [
        "Solo .Bizz offers a free plan and paid subscription plans. Plans differ mainly by the number of active clients and the features included.",
        "Current plans, prices, billing periods, currencies and any active discounts are shown on the pricing section of our website and in the app before you confirm a purchase. Prices may change; the price shown at the time of purchase applies to that billing cycle.",
        { type: "link", to: "/#pricing", label: "View current plans and pricing" },
      ],
    },
    {
      h: "6. Subscriptions, payments and renewal",
      body: [
        "Paid plans are recurring subscriptions processed by our payment provider, Stripe.",
        [
          "you pay through Stripe Checkout and a payment method is collected at purchase;",
          "the subscription renews automatically at the end of each billing period until you cancel;",
          "renewal is charged to the payment method on file;",
          "no free trial is currently offered — if a trial is introduced, its length and conditions will be shown before purchase;",
          "we do not store your full card details; they are handled by Stripe;",
          "if a payment fails, access to paid features may be limited until payment succeeds.",
        ],
        "You can manage or cancel your subscription and update your payment method through the billing portal available in your account.",
      ],
    },
    {
      h: "7. Cancellation, refunds and withdrawal",
      body: [
        "You can cancel a paid subscription at any time. Cancellation stops future renewals; paid access normally continues until the end of the current billing period.",
        "Payments already made are generally non-refundable, except where a refund is required by law or where we explicitly agree to one.",
        "**Consumers in the EU/EEA:** where you qualify as a consumer, you may have a statutory right of withdrawal within 14 days of concluding a distance contract. Where you ask us to start providing the digital service immediately during that period and acknowledge that you lose the right of withdrawal once the service has been fully performed, the right may be lost or reduced accordingly. To exercise the right, contact info@solo-bizz.com.",
        "Nothing in these Terms limits mandatory consumer rights.",
      ],
    },
    {
      h: "8. Conditions of Cooperation",
      body: [
        "In addition to these Terms, the following practical conditions apply to our cooperation:",
        [
          "the service is provided as an ongoing subscription, not as a one-off delivery;",
          "support is provided by email at info@solo-bizz.com during normal working days;",
          "we may release updates, new features and improvements at any time;",
          "your data remains yours; you can export or request deletion of the data available in your account;",
          "you are responsible for how you configure the product for your practice, including booking pages, prices, agreements and notification settings;",
          "communication between us takes place primarily by email and through in-app messages.",
        ],
      ],
    },
    {
      h: "9. Acceptable use",
      body: [
        "You agree not to:",
        [
          "use Solo .Bizz for unlawful purposes or in breach of professional rules;",
          "upload malicious code or attempt to disrupt the service;",
          "attempt to gain unauthorised access to other accounts or to our systems;",
          "reverse engineer, copy or resell the service without our written permission;",
          "use the service to send spam or unlawful communications;",
          "store data you have no legal right to process.",
        ],
      ],
    },
    {
      h: "10. Your clients' data",
      body: [
        "You decide what information about your clients you enter into Solo .Bizz. You are responsible for having a valid legal basis for that processing and for informing your clients as required.",
        "We process this data to provide the service and in line with our Privacy Policy.",
        { type: "link", to: "/privacy", label: "Privacy Policy" },
      ],
    },
    {
      h: "11. Intellectual property",
      body: [
        "The Solo .Bizz software, brand, design and content are owned by the operator of Solo .Bizz and are protected by intellectual-property law. You receive a limited, non-exclusive, non-transferable right to use the service during your subscription.",
        "Content you create or upload remains yours. You grant us only the rights needed to host, process and display it in order to provide the service.",
      ],
    },
    {
      h: "12. Availability and changes to the service",
      body: [
        "We work to keep Solo .Bizz available and reliable, but we do not guarantee uninterrupted availability. Maintenance, updates or issues at our providers may cause temporary interruptions.",
        "We may add, change or discontinue features. If we discontinue a significant paid feature, we will give reasonable notice where practicable, and you may cancel your subscription.",
      ],
    },
    {
      h: "13. Liability",
      body: [
        "The service is provided on an \"as is\" and \"as available\" basis to the extent permitted by law.",
        "We are not liable for indirect or consequential losses, loss of profit, loss of clients or loss of data beyond what applicable law provides. To the extent permitted by law, our total liability for any claim is limited to the amount you paid for the service in the twelve months before the event giving rise to the claim.",
        "Nothing here excludes liability that cannot be excluded by law, including liability for intent, gross negligence or personal injury, or mandatory consumer rights.",
      ],
    },
    {
      h: "14. Termination",
      body: [
        "You may stop using the service and delete your account at any time.",
        "We may suspend or terminate access if you materially breach these Terms, if required by law, or if your account is used in a way that endangers the service or other users. Where reasonable, we will notify you first.",
        "After termination, your data is deleted or anonymised as described in the Privacy Policy.",
      ],
    },
    {
      h: "15. Third-party services",
      body: [
        "Solo .Bizz relies on third-party providers, including our cloud infrastructure, Stripe for payments, our email delivery provider, analytics providers and — where you choose to use them — Google sign-in and Telegram notifications.",
        "Their own terms apply to their services, and we are not responsible for their independent acts or omissions.",
      ],
    },
    {
      h: "16. Governing law and disputes",
      body: [
        "These Terms are governed by the law applicable at the place of establishment of the Solo .Bizz operator, without prejudice to mandatory consumer protection rules in your country of residence.",
        "**Note for completeness:** the governing law and competent courts will be stated explicitly here once the operator's legal entity details are confirmed. Consumers may also use the European Commission's online dispute resolution platform.",
        "We will always try to resolve disputes directly first — write to info@solo-bizz.com.",
      ],
    },
    {
      h: "17. Changes to these Terms",
      body: [
        "We may update these Terms as the product and legal requirements evolve. The date at the top shows the current version.",
        "If a change is material, we will inform registered users by email or in the app before it takes effect. Continuing to use the service after the change means you accept the updated Terms.",
      ],
    },
    {
      h: "18. Contact",
      body: ["Questions about these Terms: info@solo-bizz.com."],
    },
  ],
};
