import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. What Cookies Are</h2>
            <p className="text-muted-foreground leading-relaxed">Cookies are small text files stored on your device to help websites function properly and remember essential information during your visit.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. How SoloBizz Uses Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">SoloBizz uses essential cookies and similar technologies for authentication, security, session management, and basic service functionality.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Analytics</h2>
            <p className="text-muted-foreground leading-relaxed">We may use privacy-conscious analytics to understand how the product is used and improve the service. We do not use advertising cookies or sell tracking data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">You can control or delete cookies through your browser settings. Blocking essential cookies may prevent login, checkout, or core app functionality from working correctly.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">If you have questions about this Cookie Policy, contact us at solobizz75@gmail.com.</p>
          </section>
        </div>
      </div>
      <div className="mt-auto">
        <PublicFooter />
      </div>
    </div>
  );
}