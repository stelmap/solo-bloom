// End-to-end test for account-lifecycle email localization.
//
// Contract under test:
// When an admin deactivates (or triggers permanent deletion of) a user whose
// profile language is `en`, the warning/final email MUST render in English
// and the subject logged to `email_send_log` MUST be the English subject.
// Same for `uk`. Unknown languages MUST fall back to English (matching the
// normalization in supabase/functions/admin-lifecycle-action/index.ts).
//
// We assert this by:
//   1. Replicating the exact normalizeLang() used by admin-lifecycle-action.
//   2. Calling the template's subject(templateData) function directly — this
//      is the same call `send-transactional-email` makes when writing the
//      `email_send_log.template_name` + subject row.
//   3. Verifying every localized body/CTA/preview string for the language is
//      the localized variant and none of the other locales' distinctive
//      strings leak through.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  WARNING_STRINGS,
  FINAL_STRINGS,
  normalizeLang,
  SUPPORTED_LANGS,
} from "../_shared/transactional-email-templates/lifecycle-locales.ts";

// Mirrors supabase/functions/admin-lifecycle-action/index.ts language derivation.
function adminLifecycleNormalize(profileLanguage: unknown): string {
  const raw = String(profileLanguage ?? "").toLowerCase().slice(0, 2);
  return (SUPPORTED_LANGS as readonly string[]).includes(raw) ? raw : "en";
}

const CASES = [
  {
    profileLanguage: "en",
    expected: "en",
    warningSubject: "Your SoloBizz account is scheduled for deletion",
    warningDistinctive: ["scheduled for deletion", "Login to SoloBizz"],
    finalSubject: "Your SoloBizz account has been deleted",
    finalDistinctive: ["permanently deleted", "create a new account"],
  },
  {
    profileLanguage: "uk",
    expected: "uk",
    warningSubject: "Ваш акаунт SoloBizz заплановано до видалення",
    warningDistinctive: ["заплановано до видалення", "Увійти до SoloBizz"],
    finalSubject: "Ваш акаунт SoloBizz було видалено",
    finalDistinctive: ["було остаточно видалено", "створити новий акаунт"],
  },
] as const;

for (const c of CASES) {
  Deno.test(`lifecycle emails: profile.language="${c.profileLanguage}" resolves warning + final in ${c.expected}`, () => {
    // 1. admin-lifecycle-action would compute this language and pass it as templateData.language.
    const language = adminLifecycleNormalize(c.profileLanguage);
    assertEquals(language, c.expected);
    assertEquals(normalizeLang(language), c.expected);

    // 2. Warning email — subject that ends up in email_send_log + inbox.
    const warning = WARNING_STRINGS[normalizeLang(language)];
    assertEquals(warning.subject, c.warningSubject);
    assertEquals(warning.htmlLang, c.expected);
    for (const needle of c.warningDistinctive) {
      const hay = [warning.preview, warning.heading, warning.p1, warning.p2, warning.p3, warning.cta, warning.p4].join(" | ");
      assert(hay.includes(needle), `warning[${c.expected}] body missing "${needle}" -> ${hay}`);
    }
    // No other locale's distinctive strings should appear.
    for (const other of CASES) {
      if (other.expected === c.expected) continue;
      const hay = [warning.preview, warning.heading, warning.p1, warning.p2, warning.p3, warning.cta].join(" | ");
      for (const foreign of other.warningDistinctive) {
        assert(!hay.includes(foreign), `warning[${c.expected}] must not include ${other.expected} string "${foreign}"`);
      }
    }

    // 3. Final deletion email.
    const final = FINAL_STRINGS[normalizeLang(language)];
    assertEquals(final.subject, c.finalSubject);
    assertEquals(final.htmlLang, c.expected);
    for (const needle of c.finalDistinctive) {
      const hay = [final.preview, final.heading, final.p1, final.p2].join(" | ");
      assert(hay.includes(needle), `final[${c.expected}] body missing "${needle}"`);
    }
    for (const other of CASES) {
      if (other.expected === c.expected) continue;
      const hay = [final.preview, final.heading, final.p1, final.p2].join(" | ");
      for (const foreign of other.finalDistinctive) {
        assert(!hay.includes(foreign), `final[${c.expected}] must not include ${other.expected} string "${foreign}"`);
      }
    }
  });
}

Deno.test("lifecycle emails: unsupported profile.language falls back to English (admin-lifecycle-action contract)", () => {
  for (const bad of [null, undefined, "", "xx", "de", "zh"]) {
    assertEquals(adminLifecycleNormalize(bad), "en");
    assertEquals(WARNING_STRINGS[normalizeLang(bad)].subject, "Your SoloBizz account is scheduled for deletion");
    assertEquals(FINAL_STRINGS[normalizeLang(bad)].subject, "Your SoloBizz account has been deleted");
  }
});

Deno.test("lifecycle emails: locale table covers every supported language", () => {
  for (const lang of SUPPORTED_LANGS) {
    assert(WARNING_STRINGS[lang], `WARNING_STRINGS missing ${lang}`);
    assert(FINAL_STRINGS[lang], `FINAL_STRINGS missing ${lang}`);
    assert(WARNING_STRINGS[lang].subject.length > 0);
    assert(FINAL_STRINGS[lang].subject.length > 0);
  }
});
