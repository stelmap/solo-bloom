import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed"><strong>Account Information:</strong> When you register, we collect your name, email address, and password.</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Business Data:</strong> You may enter client information, session details, income, expenses, and other business-related data. This data belongs to you.</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Payment Information:</strong> When you subscribe, payment details are processed securely by our payment provider. We do not store your full card number.</p>
            <p className="text-muted-foreground leading-relaxed"><strong>Usage Data:</strong> We collect anonymized analytics to improve our service, including pages visited and features used.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>To provide and maintain the SoloBizz service</li>
              <li>To process your subscription and billing</li>
              <li>To communicate important updates about the service</li>
              <li>To improve the product based on anonymized usage patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Data Storage & Security</h2>
            <p className="text-muted-foreground leading-relaxed">Your data is stored securely using industry-standard encryption. We use secure cloud infrastructure and follow best practices for data protection. Access to your data is restricted to authenticated users only through row-level security policies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">You own all the business data you enter into SoloBizz. We do not sell, share, or monetize your data. If you delete your account, your data will be permanently removed.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">We use essential cookies required for authentication and session management. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">We use third-party services for hosting, authentication, and payment processing. These providers have their own privacy policies and are contractually obligated to protect your data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to access, correct, export, or delete your personal data at any time. Contact us at solobizz75@gmail.com for any data-related requests.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">We may update this policy from time to time. We will notify registered users of significant changes via email.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">If you have questions about this Privacy Policy, contact us at solobizz75@gmail.com.</p>
          </section>
        </div>
      </div>
      <div className="mt-auto">
        <PublicFooter />
      </div>
    </div>
  );
}
