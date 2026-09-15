import { LegalDocPage } from "@/legal/LegalDocPage";
import { REFUND_CONTENT } from "@/legal/refund";

export default function RefundPolicyPage() {
  return (
    <LegalDocPage
      path="/refund-policy"
      seoTitle="Refund Policy — Solo .Bizz"
      seoDescription="When you can cancel a Solo .Bizz subscription, when payments are refunded, and how to request a refund through Paddle."
      content={REFUND_CONTENT}
    />
  );
}
