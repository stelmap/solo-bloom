import { LegalDocPage } from "@/legal/LegalDocPage";
import { PRIVACY_CONTENT } from "@/legal/privacy";

export default function PrivacyPage() {
  return (
    <LegalDocPage
      path="/privacy"
      seoTitle="Privacy Policy — Solo .Bizz"
      seoDescription="How Solo .Bizz collects, uses, stores and protects personal data for psychologists, therapists, coaches and tutors using our practice management tool."
      content={PRIVACY_CONTENT}
    />
  );
}
