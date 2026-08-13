import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfUse() {
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
              <h1 className="text-lg font-semibold text-foreground">Terms of Use</h1>
              <p className="text-xs text-muted-foreground">
                Terms and conditions for using this service
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
              <h2 className="text-lg font-semibold text-foreground">Agreement to Terms</h2>
              <p className="text-sm text-muted-foreground">
                By using BillWatch, you agree to these terms of use. If you do not agree, please do not use our service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Service Description</h2>
              <p className="text-sm text-muted-foreground">
                BillWatch is a personal finance application that helps you track bills, set reminders, and manage payments. 
                The service includes OCR scanning, AI-powered bill categorization, and automated reminders.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">User Responsibilities</h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Provide accurate information about your bills and payments</li>
                <li>Keep your account secure and confidential</li>
                <li>Use the service only for personal, non-commercial purposes</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not attempt to reverse engineer or compromise the service</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Service Availability</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  We strive to provide reliable service but cannot guarantee 100% uptime. The service may be temporarily unavailable for:
                </p>
                <ul className="space-y-1 list-disc pl-5">
                  <li>Scheduled maintenance and updates</li>
                  <li>Emergency repairs or security patches</li>
                  <li>Issues beyond our control (hosting, network, etc.)</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Limitations of Liability</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  BillWatch is a tool to help organize your financial information. We are not responsible for:
                </p>
                <ul className="space-y-1 list-disc pl-5">
                  <li>Missed payments or late fees</li>
                  <li>Accuracy of OCR or AI-processed information</li>
                  <li>Financial decisions made using the app</li>
                  <li>Data loss due to user error or technical issues</li>
                </ul>
                <p className="mt-2">
                  <strong className="text-foreground">Important:</strong> Always verify bill information and payment dates independently.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Intellectual Property</h2>
              <p className="text-sm text-muted-foreground">
                The BillWatch application, including its design, features, and code, is owned by Debt to Legacy LLC. 
                You may not copy, modify, or distribute the application without permission.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Termination</h2>
              <p className="text-sm text-muted-foreground">
                You may stop using the service at any time. We may suspend or terminate access for violations of these terms. 
                Upon termination, you may request deletion of your data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Changes to Terms</h2>
              <p className="text-sm text-muted-foreground">
                We may update these terms periodically. Continued use of the service after changes indicates acceptance of new terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>
              <p className="text-sm text-muted-foreground">
                For questions about these terms, contact us at{" "}
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