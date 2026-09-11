import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

export const cookiesEn: LegalDoc = {
  back: "Back to home",
  title: "Cookie Policy",
  updated: LEGAL_LAST_UPDATED.en,
  intro:
    "This Cookie Policy explains which cookies and similar technologies Solo .Bizz actually uses, what they do, and how you can control them.",
  sections: [
    {
      h: "1. What cookies and similar technologies are",
      body: [
        "Cookies are small files stored by your browser. Similar technologies include local storage, which keeps information in the browser without sending it with every request.",
        "Some of these are necessary to make the website and the app work. Others are optional and are only used with your consent.",
      ],
    },
    {
      h: "2. Cookies and storage we use",
      body: [
        {
          type: "table",
          headers: ["Name", "Provider", "Purpose", "Category", "Duration", "Party"],
          rows: [
            [
              "sb-*-auth-token",
              "Solo .Bizz (Lovable Cloud)",
              "Keeps you signed in and maintains your session",
              "Necessary",
              "Until sign-out or session expiry",
              "First party",
            ],
            [
              "cookie_consent_v1",
              "Solo .Bizz",
              "Stores your cookie choices so we do not ask again",
              "Necessary",
              "Until you clear it or change your choice",
              "First party",
            ],
            [
              "app_lang / landing_lang / pre_login_lang",
              "Solo .Bizz",
              "Remembers your selected interface language",
              "Necessary",
              "Until you clear browser storage",
              "First party",
            ],
            [
              "ph_* (PostHog)",
              "PostHog (EU)",
              "Product analytics: which features and pages are used",
              "Analytics",
              "Up to 12 months",
              "First party",
            ],
            [
              "Plerdy cookies and storage",
              "Plerdy",
              "Website usage analytics and heatmaps",
              "Analytics",
              "As set by the provider",
              "Third party",
            ],
            [
              "_fbp and related Meta Pixel identifiers",
              "Meta",
              "Advertising measurement and campaign attribution",
              "Marketing",
              "Up to 90 days",
              "Third party",
            ],
            [
              "Stripe cookies",
              "Stripe",
              "Payment processing and fraud prevention during checkout",
              "Necessary",
              "As set by the provider",
              "Third party",
            ],
          ],
        },
        "Necessary cookies and storage are always active because the service cannot work without them. Analytics and marketing technologies are loaded only after you allow the matching category.",
      ],
    },
    {
      h: "3. Your consent",
      body: [
        "When you first visit the website, a consent banner appears with equally available options to accept all, reject everything that is not necessary, or manage your preferences by category.",
        "No analytics or marketing technology is loaded before you give consent. Your choice is remembered on this device and applied on every later visit.",
      ],
    },
    {
      h: "4. Changing or withdrawing your choice",
      body: [
        "You can change or withdraw your consent at any time using the **Cookie settings** link in the footer of the website. Withdrawing consent stops the corresponding technologies from loading afterwards.",
        "You can also delete cookies and site data in your browser settings. Blocking necessary cookies may prevent parts of the service from working.",
      ],
    },
    {
      h: "5. Changes to this policy",
      body: [
        "If we add or remove a technology, this policy and the table above are updated. The date at the top shows the current version.",
      ],
    },
    {
      h: "6. Contact and related documents",
      body: [
        "Questions about cookies: info@solo-bizz.com.",
        { type: "link", to: "/privacy", label: "Privacy Policy" },
        { type: "link", to: "/terms", label: "Terms & Conditions" },
      ],
    },
  ],
};
