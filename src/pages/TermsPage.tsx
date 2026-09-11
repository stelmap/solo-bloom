import { LegalDocPage } from "@/legal/LegalDocPage";
import { TERMS_CONTENT } from "@/legal/terms";

export default function TermsPage() {
  return (
    <LegalDocPage
      path="/terms"
      seoTitle="Terms & Conditions — Solo .Bizz"
      seoDescription="The terms that apply to using Solo .Bizz: accounts, subscriptions and billing, cancellation, acceptable use, liability and support."
      content={TERMS_CONTENT}
    />
  );
}
