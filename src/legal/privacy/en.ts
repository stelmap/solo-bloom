import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

// TODO (administrator): the legal entity name, registered address, company
// registration number and VAT number of the Solo .Bizz operator are not
// available in the project configuration. Add them to section 1 once
// confirmed. Do not guess these values.

export const privacyEn: LegalDoc = {
  back: "Back to home",
  title: "Privacy Policy",
  updated: LEGAL_LAST_UPDATED.en,
  intro:
    "This Privacy Policy explains, in plain language, how Solo .Bizz handles personal data when you visit our website or use the Solo .Bizz application.",
  sections: [
    {
      h: "1. Who we are (data controller)",
      body: [
        "Solo .Bizz is a practice-management platform for independent professionals such as psychologists, therapists, supervisors, coaches, tutors and consultants.",
        "For the processing described in this policy where Solo .Bizz acts as controller, the operator of Solo .Bizz is the controller. You can reach us at info@solo-bizz.com.",
        "**Note for completeness:** the full legal entity details (registered company name, address, registration number, VAT number) will be published here once formally confirmed. Until then, all privacy requests can be sent to the contact address above.",
        "We have not appointed a Data Protection Officer. Privacy requests are handled through the contact address above.",
      ],
    },
    {
      h: "2. Two kinds of data: yours and your clients'",
      body: [
        "**A. Data about the Solo .Bizz user.** This is data about you as a professional using the platform: your account, your subscription, your support requests and how you use the product.",
        "**B. Data about your clients.** This is the information you enter into Solo .Bizz while running your own practice, for example client contact details, sessions, notes, agreements and payment status.",
        "The distinction matters: we handle category A for our own purposes as a service provider, while category B is your practice data, which we process on your behalf and under your instructions.",
      ],
    },
    {
      h: "3. What data we collect",
      body: [
        "Depending on how you use Solo .Bizz, we may process:",
        [
          "account information (name, email address, language, account settings);",
          "authentication information (login credentials handled by our authentication system, sign-in method, session tokens);",
          "subscription and billing information (plan, billing period, payment status, payment-provider customer and transaction references);",
          "support requests and communications, including contact-form and demo requests;",
          "product usage and technical information (features used, pages viewed, error and performance logs);",
          "device and browser information (device type, browser, operating system, IP address);",
          "analytics information, where the relevant consent has been given;",
          "cookie preferences;",
          "information you voluntarily enter into Solo .Bizz about your practice and your clients.",
        ],
        "We do not store full payment card numbers. Card data is handled directly by our payment provider.",
        "We do not sell personal data.",
      ],
    },
    {
      h: "4. Controller and processor roles",
      body: [
        "Solo .Bizz determines the purposes and means of processing — and therefore acts as controller, where applicable — for its own account management, subscriptions and billing, security, support, website and product analytics.",
        "When you store information about your own clients in Solo .Bizz, you generally determine why and how that client data is used. In those cases Solo .Bizz processes that data on your behalf as a processor, subject to the applicable agreement, data-processing terms and applicable data-protection law.",
        "Where the exact role depends on the specific processing activity, the role is assessed for that activity.",
      ],
    },
    {
      h: "5. Sensitive and special-category data",
      body: [
        "Because Solo .Bizz can be used by psychologists, therapists and similar professionals, information you enter may include sensitive or special-category personal data about your clients.",
        "Solo .Bizz does not require you to enter health or other special-category data, and does not ask for it.",
        [
          "You are responsible for having an appropriate legal basis for collecting and storing your clients' information;",
          "you should only enter the information that is necessary for your professional work;",
          "Solo .Bizz processes such information only to provide the service, and in accordance with the applicable agreement and data-processing terms.",
        ],
      ],
    },
    {
      h: "6. Why we process data",
      body: [
        "Where applicable, we process personal data to:",
        [
          "create and manage user accounts;",
          "provide Solo .Bizz functionality, including calendar, session and client management;",
          "handle subscriptions, checkout and payments;",
          "provide customer support and answer contact requests;",
          "keep the service secure and prevent fraud and abuse;",
          "monitor availability and diagnose technical problems;",
          "analyse product usage and improve the service;",
          "send transactional messages (account, billing, security, session-related notifications);",
          "send marketing communication only where a valid legal basis or your consent exists;",
          "comply with legal obligations, including accounting and tax requirements.",
        ],
      ],
    },
    {
      h: "7. Legal bases",
      body: [
        "Where the GDPR applies, we rely on the following legal bases:",
        [
          "**performance of a contract** — providing the service, managing your account, processing your subscription;",
          "**compliance with legal obligations** — accounting, tax, and responding to lawful requests;",
          "**legitimate interests** — security, fraud prevention, service monitoring, product improvement and limited direct communication, balanced against your rights;",
          "**consent** — where consent is required, for example optional analytics or marketing cookies and certain marketing messages. You can withdraw consent at any time.",
        ],
        "Not everything is based on consent: most of the processing needed to run your account is based on the contract with you.",
      ],
    },
    {
      h: "8. Service providers and subprocessors",
      body: [
        "We use a limited number of third-party providers to operate the service. The providers currently used are:",
        [
          "**Lovable Cloud** — hosting, database, authentication, file storage and server-side functions;",
          "**Stripe** — subscription checkout, payment processing and billing management;",
          "**Lovable managed email delivery** — transactional email (account, booking, session and billing notifications);",
          "**PostHog (EU)** — product analytics;",
          "**Plerdy** — website usage analytics and heatmaps, loaded only after analytics consent;",
          "**Meta Pixel** — advertising measurement, loaded only after marketing consent;",
          "**Google** — sign-in with Google, if you choose that sign-in method;",
          "**Telegram** — optional notification delivery, only if you connect Telegram to your account.",
        ],
        "These providers may process personal data only as needed to provide their services to Solo .Bizz.",
      ],
    },
    {
      h: "9. International data transfers",
      body: [
        "Some of our providers may process data outside the European Economic Area. Where that happens, transfers are made on the basis of the safeguards required by applicable data-protection law, such as European Commission adequacy decisions or Standard Contractual Clauses.",
        "We do not claim that all data always remains inside the EU, because certain providers operate globally.",
      ],
    },
    {
      h: "10. Data retention",
      body: [
        "We keep personal data only as long as necessary for:",
        [
          "delivering the service and maintaining your active account;",
          "complying with legal, accounting and tax requirements;",
          "resolving disputes and enforcing agreements;",
          "protecting legitimate business and security interests.",
        ],
        "Practice and client data stays in your account for as long as your account is active, or until you delete it. After account deletion, data is removed or anonymised, except where longer retention is required by law.",
      ],
    },
    {
      h: "11. Your rights",
      body: [
        "Where the GDPR applies, you have the right to:",
        [
          "access your personal data;",
          "have inaccurate data corrected;",
          "have data erased;",
          "restrict processing;",
          "object to processing based on legitimate interests;",
          "receive your data in a portable format;",
          "withdraw consent where processing is based on consent;",
          "lodge a complaint with the competent supervisory authority.",
        ],
        "If you are a client of a Solo .Bizz professional, please contact that professional first — they decide how your data is used in their practice.",
      ],
    },
    {
      h: "12. Account deletion and data export",
      body: [
        "You can request account deletion, deletion of your personal data, an export of the data available in your account, or any other privacy-related assistance.",
        "Requests can be made from your account settings where the option is available, or by writing to info@solo-bizz.com. We may need to verify your identity before acting on a request.",
      ],
    },
    {
      h: "13. Security",
      body: [
        "We apply appropriate technical and organisational measures to protect personal data, including encrypted transport, authentication controls, row-level access restrictions in the database, access logging and regular maintenance.",
        "No online service can be completely secure, so we do not make absolute security promises. Please keep your credentials safe and tell us if you suspect unauthorised access to your account.",
      ],
    },
    {
      h: "14. Changes to this policy",
      body: [
        "We may update this Privacy Policy as the product or legal requirements change. The date at the top always shows the current version.",
        "Where a change is material, we will communicate it where legally required or otherwise appropriate.",
      ],
    },
    {
      h: "15. Related documents",
      body: [
        "This policy should be read together with our Terms & Conditions and Cookie Policy.",
        { type: "link", to: "/terms", label: "Terms & Conditions" },
        { type: "link", to: "/cookie-policy", label: "Cookie Policy" },
      ],
    },
  ],
};
