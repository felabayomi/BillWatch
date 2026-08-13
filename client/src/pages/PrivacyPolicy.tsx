import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="flex items-center p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="p-2 mr-3"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground">
                How we protect your information
              </p>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6 pb-24">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Last updated: January 2025
            </p>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Account Information:</strong> When you sign in, we collect your email address, name, and profile information from the configured identity provider.
                </p>
                <p>
                  <strong className="text-foreground">Bill Data:</strong> Information you enter about your bills including company names, amounts, due dates, and payment status.
                </p>
                <p>
                  <strong className="text-foreground">Uploaded Documents:</strong> Images and documents you scan or upload for bill processing.
                </p>
                <p>
                  <strong className="text-foreground">Usage Data:</strong> How you interact with the app to improve our service.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Provide bill tracking and reminder services</li>
                <li>Process and categorize your bills using AI</li>
                <li>Send notifications about upcoming payments</li>
                <li>Improve our OCR and AI features</li>
                <li>Provide customer support</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Data Security</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Your financial data is encrypted and stored securely. We use industry-standard security measures including:
                </p>
                <ul className="space-y-1 list-disc pl-5">
                  <li>SSL/TLS encryption for data transmission</li>
                  <li>Encrypted database storage</li>
                  <li>Secure authentication through our identity provider</li>
                  <li>Regular security audits and updates</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Data Sharing</h2>
              <p className="text-sm text-muted-foreground">
                We do not sell, trade, or share your personal financial information with third parties. Your data remains private and is only used to provide our bill tracking services. Debt to Legacy LLC is committed to protecting your privacy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Access and download your data at any time</li>
                <li>Request deletion of your account and all data</li>
                <li>Update or correct your information</li>
                <li>Opt out of notifications (though this may limit functionality)</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Contact</h2>
              <p className="text-sm text-muted-foreground">
                For privacy concerns or to exercise your rights, contact us at{" "}
                <a href="https://debttolegacy.com" className="text-primary hover:underline">
                  debttolegacy.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
