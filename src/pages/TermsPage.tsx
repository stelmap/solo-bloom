import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 13, 2026</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">By creating an account or using SoloBizz, you agree to these Terms & Conditions. If you do not agree to these Terms, please do not use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz is a cloud-based business management tool for solo professionals and small private practices, including psychologists, therapists, coaches, tutors, and similar service providers.</p>
            <p className="text-muted-foreground leading-relaxed">SoloBizz provides functionality for client management, session scheduling, payment tracking, income and expense tracking, financial insights, and practice organization.</p>
            <p className="text-muted-foreground leading-relaxed">SoloBizz is intended to support business administration and practice management. Financial insights provided by SoloBizz are for informational purposes only and should not be considered legal, tax, accounting, or financial advice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Free Starter Plan</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz offers a permanent free plan called Free Starter.</p>
            <p className="text-muted-foreground leading-relaxed">Free Starter is not a time-limited free trial. It does not expire after a fixed number of days.</p>
            <p className="text-muted-foreground leading-relaxed">Users may use SoloBizz free of charge while they have up to 5 active clients.</p>
            <p className="text-muted-foreground leading-relaxed">An active client means a client record that is not archived. Archived clients do not count toward the active client limit.</p>
            <p className="text-muted-foreground leading-relaxed">If a Free Starter user attempts to create or reactivate a client and this would exceed the limit of 5 active clients, SoloBizz may require the user to upgrade to a paid subscription plan before adding or reactivating that client.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Subscription Plans & Billing</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz offers the following plans:</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Free Starter</strong></p>
            <p className="text-muted-foreground leading-relaxed">Free Starter costs €0 per month.</p>
            <p className="text-muted-foreground leading-relaxed">This plan allows users to manage up to 5 active clients.</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Solo Practice</strong></p>
            <p className="text-muted-foreground leading-relaxed">Solo Practice is a paid subscription plan for users who need to manage up to 20 active clients.</p>
            <p className="text-muted-foreground leading-relaxed">The Solo Practice monthly price is:</p>
            <p className="text-muted-foreground leading-relaxed">€19 per month</p>
            <p className="text-muted-foreground leading-relaxed">Solo Practice may also be offered with discounted billing cycles:</p>
            <p className="text-muted-foreground leading-relaxed">€45.60 per quarter with quarterly billing</p>
            <p className="text-muted-foreground leading-relaxed">€136.80 per year with yearly billing</p>
            <p className="text-muted-foreground leading-relaxed">Quarterly billing includes a 20% discount compared to paying monthly for the same period.</p>
            <p className="text-muted-foreground leading-relaxed">Yearly billing includes a 40% discount compared to paying monthly for the same period.</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Pro Practice</strong></p>
            <p className="text-muted-foreground leading-relaxed">Pro Practice is a paid subscription plan for users who need to manage more than 20 active clients or an unlimited number of active clients.</p>
            <p className="text-muted-foreground leading-relaxed">The Pro Practice monthly price is:</p>
            <p className="text-muted-foreground leading-relaxed">€49 per month</p>
            <p className="text-muted-foreground leading-relaxed">Pro Practice may also be offered with discounted billing cycles:</p>
            <p className="text-muted-foreground leading-relaxed">€117.60 per quarter with quarterly billing</p>
            <p className="text-muted-foreground leading-relaxed">€352.80 per year with yearly billing</p>
            <p className="text-muted-foreground leading-relaxed">Quarterly billing includes a 20% discount compared to paying monthly for the same period.</p>
            <p className="text-muted-foreground leading-relaxed">Yearly billing includes a 40% discount compared to paying monthly for the same period.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Plan Limits and Upgrade Requirements</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz plans are differentiated by the number of active clients available under each plan.</p>
            <p className="text-muted-foreground leading-relaxed">The current plan limits are:</p>
            <p className="text-muted-foreground leading-relaxed">Free Starter: up to 5 active clients</p>
            <p className="text-muted-foreground leading-relaxed">Solo Practice: up to 20 active clients</p>
            <p className="text-muted-foreground leading-relaxed">Pro Practice: unlimited active clients</p>
            <p className="text-muted-foreground leading-relaxed">If a user reaches the active client limit of their current plan, SoloBizz may restrict the creation or reactivation of additional active clients until the user upgrades to a suitable plan or reduces the number of active clients by archiving existing clients.</p>
            <p className="text-muted-foreground leading-relaxed">If a user archives a client, that client no longer counts toward the active client limit.</p>
            <p className="text-muted-foreground leading-relaxed">If a user reactivates an archived client and this causes the account to exceed the current plan limit, the user may be required to upgrade before the client can be reactivated.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Payment Method and Auto-Renewal</h2>
            <p className="text-muted-foreground leading-relaxed">Payments for paid subscription plans are processed securely through our payment provider.</p>
            <p className="text-muted-foreground leading-relaxed">To subscribe to a paid plan, you may be required to provide a valid payment method.</p>
            <p className="text-muted-foreground leading-relaxed">Paid subscriptions renew automatically according to the selected billing cycle unless cancelled before the renewal date.</p>
            <p className="text-muted-foreground leading-relaxed">The available billing cycles may include:</p>
            <p className="text-muted-foreground leading-relaxed">Monthly billing</p>
            <p className="text-muted-foreground leading-relaxed">Quarterly billing</p>
            <p className="text-muted-foreground leading-relaxed">Yearly billing</p>
            <p className="text-muted-foreground leading-relaxed">By subscribing to a paid plan, you authorize SoloBizz or its payment provider to charge the applicable subscription fee according to the selected billing cycle.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Failed Payments</h2>
            <p className="text-muted-foreground leading-relaxed">If a payment fails, we or our payment provider may attempt to charge the payment method again.</p>
            <p className="text-muted-foreground leading-relaxed">If payment is not successfully completed after multiple attempts, SoloBizz may suspend or limit access to paid plan capacity until the payment issue is resolved.</p>
            <p className="text-muted-foreground leading-relaxed">If access is limited due to failed payment, your data will not be intentionally deleted immediately, but your ability to create or reactivate additional clients may be restricted.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Cancellation & Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">You may cancel your paid subscription at any time.</p>
            <p className="text-muted-foreground leading-relaxed">After cancellation, you will retain access to the paid plan until the end of the current paid billing period.</p>
            <p className="text-muted-foreground leading-relaxed">No partial refunds are provided for unused time within a billing period unless required by applicable law.</p>
            <p className="text-muted-foreground leading-relaxed">After the paid billing period ends, your account may be moved to the plan that matches your current number of active clients.</p>
            <p className="text-muted-foreground leading-relaxed">If your number of active clients exceeds the available limit of the applicable plan, you may be required to archive clients or upgrade your subscription to continue creating or reactivating client records.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Taxes and Currency</h2>
            <p className="text-muted-foreground leading-relaxed">Prices are displayed in euros.</p>
            <p className="text-muted-foreground leading-relaxed">Depending on your location and payment provider settings, prices may be shown inclusive or exclusive of applicable taxes.</p>
            <p className="text-muted-foreground leading-relaxed">Any applicable taxes, payment provider fees, or currency conversion charges may be shown during checkout before payment confirmation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Your Data</h2>
            <p className="text-muted-foreground leading-relaxed">You retain ownership of the data you enter into SoloBizz.</p>
            <p className="text-muted-foreground leading-relaxed">SoloBizz does not sell your data.</p>
            <p className="text-muted-foreground leading-relaxed">We may process your data as necessary to provide, maintain, secure, and improve the service. Some data may be processed by trusted service providers that support the operation of SoloBizz, such as hosting, analytics, communication, or payment processing providers.</p>
            <p className="text-muted-foreground leading-relaxed">Your use of SoloBizz may also be subject to our Privacy Policy.</p>
            <p className="text-muted-foreground leading-relaxed">You may request export or deletion of your data where technically available and legally permitted.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree to use SoloBizz only for lawful professional and business purposes.</p>
            <p className="text-muted-foreground leading-relaxed">You must not:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>attempt to access another user’s data;</li>
              <li>interfere with the security or operation of the service;</li>
              <li>reverse-engineer, copy, or misuse the platform;</li>
              <li>use SoloBizz for illegal, harmful, or unauthorized activities;</li>
              <li>upload content that violates applicable laws or third-party rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">12. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">We strive to maintain reliable service availability, but we do not guarantee uninterrupted or error-free operation.</p>
            <p className="text-muted-foreground leading-relaxed">SoloBizz may perform maintenance, updates, or improvements from time to time. Where reasonable, we may provide notice of planned maintenance.</p>
            <p className="text-muted-foreground leading-relaxed">SoloBizz is not liable for losses resulting from temporary service interruptions, technical issues, or third-party provider outages.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">13. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz is provided on an "as is" and "as available" basis.</p>
            <p className="text-muted-foreground leading-relaxed">To the maximum extent permitted by applicable law, SoloBizz is not liable for indirect, incidental, special, consequential, or punitive damages arising from the use of the service.</p>
            <p className="text-muted-foreground leading-relaxed">Our total liability for any claim related to the service is limited to the amount you paid to SoloBizz during the 12 months preceding the event that gave rise to the claim.</p>
            <p className="text-muted-foreground leading-relaxed">For users on the Free Starter plan, our total liability is limited to the maximum extent permitted by applicable law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">14. Changes to Plans, Prices, and Terms</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz may update subscription plans, prices, client limits, billing options, or these Terms from time to time.</p>
            <p className="text-muted-foreground leading-relaxed">Registered users will be notified of significant changes by email, in-app notification, or another reasonable method.</p>
            <p className="text-muted-foreground leading-relaxed">Changes to paid subscription prices will not affect an already paid billing period unless required by law or agreed by the user.</p>
            <p className="text-muted-foreground leading-relaxed">Continued use of SoloBizz after changes become effective constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">15. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">For questions about these Terms & Conditions, contact us at:</p>
            <p className="text-muted-foreground leading-relaxed"><a href="mailto:info@solo-bizz.com" className="text-foreground hover:underline">info@solo-bizz.com</a></p>
          </section>
        </div>
      </div>
      <div className="mt-auto">
        <PublicFooter />
      </div>
    </div>
  );
}
