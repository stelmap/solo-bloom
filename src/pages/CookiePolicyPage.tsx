import { LegalDocPage } from "@/legal/LegalDocPage";
import { COOKIES_CONTENT } from "@/legal/cookies";

export default function CookiePolicyPage() {
  return (
    <LegalDocPage
      path="/cookie-policy"
      seoTitle="Cookie Policy — Solo .Bizz"
      seoDescription="Which cookies and similar technologies Solo .Bizz uses, what they do, and how you can change or withdraw your consent at any time."
      content={COOKIES_CONTENT}
    />
  );
}
