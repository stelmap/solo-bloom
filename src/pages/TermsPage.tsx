import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">By creating an account or using SoloBizz, you agree to these Terms & Conditions. If you do not agree, please do not use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz is a cloud-based business management tool for solo professionals. It provides client management, session scheduling, income and expense tracking, and financial insights.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Free Trial</h2>
            <p className="text-muted-foreground leading-relaxed">New users receive a 7-day free trial with full access to all features. During the trial, no payment is required. The trial begins when you create your account.</p>
            <p className="text-muted-foreground leading-relaxed">At the end of the trial period, you will need to subscribe to continue using the service. If you do not subscribe, your access will be limited until you choose a plan.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Subscription & Billing</h2>
            <p className="text-muted-foreground leading-relaxed"><strong>Price:</strong> The SoloBizz subscription costs 20€ per month.</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Billing cycle:</strong> Your subscription renews monthly on the anniversary of your subscription start date.</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Payment method:</strong> Payments are processed securely through our payment provider. You must provide a valid payment method to subscribe.</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Auto-renewal:</strong> Your subscription will automatically renew each month unless you cancel before the renewal date.</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Failed payments:</strong> If a payment fails, we will attempt to charge again. After multiple failures, your access may be suspended until payment is resolved.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Cancellation & Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">You may cancel your subscription at any time. Upon cancellation, you will retain access until the end of your current billing period. No partial refunds are provided for unused time within a billing period.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Your Data</h2>
            <p className="text-muted-foreground leading-relaxed">You retain ownership of all data you enter into SoloBizz. We do not sell or share your data with third parties. You may export or delete your data at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree to use SoloBizz only for lawful business purposes. You must not attempt to access other users' data, reverse-engineer the service, or use the platform for any illegal activity.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. We may perform maintenance with reasonable notice. We are not liable for losses resulting from temporary service disruptions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from the use of the service. Our total liability is limited to the amount you have paid in the preceding 12 months.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">We may update these terms from time to time. Registered users will be notified of significant changes via email. Continued use of the service after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">For questions about these terms, contact us at support@solobizz.app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
