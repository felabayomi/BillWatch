import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { ArrowLeft, Receipt, FileText, Scale, AlertTriangle, UserCheck, RefreshCw } from "lucide-react";
import { Link } from "wouter";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">FinanceWatch</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Use</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Legal agreement governing your use of FinanceWatch
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Last updated: February 27, 2026</p>
          </div>

          <div className="space-y-8">

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle>Acceptance of Terms</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  By accessing and using FinanceWatch ("the Service"), provided by Debt to Legacy LLC ("Company," "we," "us"), you agree to be bound by these Terms of Use. If you do not agree, you are prohibited from using this service.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Access to FinanceWatch requires an active Felix Pay membership. Your membership agreement with Felix Pay governs payment and subscription terms.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  <CardTitle>Service Description & Your Responsibilities</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Service Overview</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    FinanceWatch is a comprehensive personal finance management platform offering manual transaction tracking, daily balance reconciliation, bill management, business expense tracking, receipt/invoice upload with AI parsing, multi-business support, financial reporting, and read-only accountant share links.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Account Security</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    You are responsible for maintaining the security of your Felix Pay login credentials. Notify us immediately of any unauthorized account access.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Data Accuracy</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    You are solely responsible for the accuracy of financial data you enter. FinanceWatch provides calculation and tracking tools — you remain responsible for verifying figures against your actual bank and financial institution records.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Accountant Share Links</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    When you generate a share link, you are responsible for who you share it with. Anyone with the link URL can view the scoped financial data until you revoke it. Only share with people you trust for legitimate accounting or tax purposes.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-purple-600" />
                  <CardTitle>Acceptable Use Policy</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Permitted Uses</h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Personal and business financial tracking and management</li>
                    <li>Expense categorization and budget monitoring</li>
                    <li>Account balance reconciliation and reporting</li>
                    <li>Bill tracking and payment management</li>
                    <li>Receipt and invoice upload for your own financial records</li>
                    <li>Sharing read-only financial summaries with your accountant or tax preparer</li>
                    <li>Receiving transaction data synced from authorized connected apps</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Prohibited Activities</h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Sharing account access credentials with unauthorized individuals</li>
                    <li>Using the service to track or store financial data belonging to others without their consent</li>
                    <li>Uploading receipts or documents that don't belong to you</li>
                    <li>Using the service for illegal financial activities or money laundering</li>
                    <li>Attempting to reverse engineer, hack, or compromise the platform</li>
                    <li>Overloading the system with automated requests or scripts</li>
                    <li>Using API sync credentials to push fabricated or fraudulent transaction data</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <CardTitle>Disclaimers</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Not Financial Advice</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    FinanceWatch is a tracking and reporting tool only. It does not provide financial advice, tax advice, investment recommendations, or professional financial planning services. Consult qualified professionals for those needs.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">AI-Generated Extractions</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    The AI receipt parsing feature uses OpenAI to extract data from images. Extracted values may not always be accurate. Always review AI-filled fields before saving a transaction.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Service Availability</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We strive for high availability but cannot guarantee uninterrupted service. The platform may experience downtime for maintenance, updates, or technical issues beyond our control.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Data Backup</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We implement robust backup measures, but you are encouraged to regularly export your financial data. We are not liable for data loss caused by user error, technical failures, or service discontinuation.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-red-600" />
                  <CardTitle>Limitation of Liability</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  To the fullest extent permitted by law, Debt to Legacy LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to financial loss, data loss, or decisions made based on data in the platform.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Our total liability to you for any claim arising from the service shall not exceed the amount you paid in the 12 months preceding the claim, or $100, whichever is greater.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-teal-600" />
                  <CardTitle>Service Changes & Termination</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Modifications</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We reserve the right to modify, update, or discontinue features at any time. We will provide reasonable notice for changes that significantly affect your data or access.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Termination</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Your access to FinanceWatch is tied to your Felix Pay membership. If your membership lapses or is terminated, your access will be suspended. Your data is retained for a grace period to allow you to renew or export before deletion.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Data Retention After Termination</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Following account termination, personal and financial data is deleted according to our Privacy Policy, typically within 30 days, unless longer retention is required by law.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <CardTitle>Legal & Contact Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Governing Law</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    These terms are governed by the laws of the jurisdiction where Debt to Legacy LLC is incorporated, without regard to conflict of law principles.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Terms Updates</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We may update these terms periodically. Continued use of the service after changes constitutes acceptance. Material changes will be communicated via email or in-app notification.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Contact</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    For questions about these terms, contact us at{" "}
                    <a href="mailto:felix@debttolegacy.com" className="text-blue-600 hover:underline dark:text-blue-400">felix@debttolegacy.com</a>{" "}
                    or visit{" "}
                    <a href="https://debttolegacy.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">debttolegacy.com</a>.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="mt-12 pb-8">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <Link href="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
              <Link href="/data-usage" className="hover:text-blue-600 transition-colors">Data Usage</Link>
              <Link href="/how-to-use" className="hover:text-blue-600 transition-colors">How to Use</Link>
              <Link href="/about" className="hover:text-blue-600 transition-colors">About</Link>
            </div>
            <div className="text-center">
              <Link href="/">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
