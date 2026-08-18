import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { ArrowLeft, Receipt, Shield, Lock, Eye, Database, Users, Globe, Cloud, Brain } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              How we protect and handle your personal and financial information
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Last updated: February 27, 2026</p>
          </div>

          <div className="space-y-8">

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <CardTitle>Information We Collect</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Account & Identity Information</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    When you sign in via Felix Pay SSO, we receive your user ID and email address from the authentication provider. We do not store passwords.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Financial Data You Enter</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    All financial information you manually enter is stored in your account â€” account details, transactions, balances, categories, bills, businesses, and transfers. This data is entirely yours and under your control.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Receipt & Invoice Images</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Receipt and invoice images you upload are stored in Replit Object Storage â€” a secure cloud file system. These files are private to your account and linked to individual transactions.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Synced Data</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    If you use ExpenseWatch, BillWatch, or IncomeLift, transaction data synced from those apps is stored in your FinanceWatch account exactly as entered. Synced receipt images are also stored.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Usage Information</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We collect basic access logs and performance metrics to maintain and improve the platform. This data is not linked to your financial records.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-green-600" />
                  <CardTitle>AI Processing of Receipts</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  When you use the receipt upload feature to auto-fill a transaction, your receipt image is sent to <strong>OpenAI's Vision API</strong> for parsing. The extracted data (amount, date, description, category) is returned and used to pre-fill your form. You review and confirm before any data is saved.
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
                  <li>Images are transmitted securely over an encrypted connection</li>
                  <li>OpenAI does not store or use your images for AI model training under Replit's API agreement</li>
                  <li>This processing only happens when you actively use the upload feature</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-green-600" />
                  <CardTitle>How We Protect Your Data</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Encryption</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    All data is encrypted in transit using TLS. Your database and file storage are encrypted at rest using industry-standard methods.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Access Controls</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Every record in the database is scoped to your user ID. No other user can access your data. Staff cannot view your personal financial records without your explicit authorization.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Accountant Share Links</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    When you generate a share link for your accountant, you control the scope (year and transaction type). The link is read-only and can be revoked by you at any time. Anyone with the link URL can view that scoped data until it is revoked â€” treat it like a shared document.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-purple-600" />
                  <CardTitle>How We Use Your Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Service Provision</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Your data is used solely to operate FinanceWatch â€” balance calculations, reports, bill tracking, syncing, and all other features you use.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Communication</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We may use your email for important service updates or security notifications. We do not send unsolicited marketing emails.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Platform Improvement</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Anonymous, aggregated usage metrics help us improve performance and usability. Individual financial data is never used for this purpose.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-orange-600" />
                  <CardTitle>Information Sharing</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">We Never Sell Your Data</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We do not sell, rent, or share your personal financial data with third parties for advertising, marketing, or profiling purposes.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Trusted Service Providers</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We work with Replit (hosting and storage), Neon (database), OpenAI (receipt parsing), and Felix Pay (authentication). Each is bound by confidentiality and data protection requirements. See our <Link href="/data-usage" className="text-blue-600 hover:underline">Data Usage page</Link> for details on each provider.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Legal Requirements</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We may disclose information only when required by law or to protect the rights and safety of our users.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-red-600" />
                  <CardTitle>Your Data Rights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Access & Review</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    You can view all of your financial data at any time through the application. Your complete transaction history, account information, and all records are always visible to you.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Correction & Deletion</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    You can edit or delete any transaction, account, bill, or business record at any time within the app.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Account Deletion</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    You can request permanent deletion of your account and all associated data by contacting us at <a href="mailto:felix@debttolegacy.com" className="text-blue-600 hover:underline">felix@debttolegacy.com</a>. Deletion is typically completed within 30 days.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-teal-600" />
                  <CardTitle>Contact & Policy Updates</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  For privacy questions or to exercise your data rights, contact us at{" "}
                  <a href="mailto:felix@debttolegacy.com" className="text-blue-600 hover:underline dark:text-blue-400">felix@debttolegacy.com</a>{" "}
                  or visit{" "}
                  <a href="https://debttolegacy.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">debttolegacy.com</a>.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  We may update this policy to reflect changes in our practices. We'll notify you of significant changes via email or in-app notification.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  This service is provided by <strong>Debt to Legacy LLC</strong>, committed to helping you achieve financial freedom while keeping your privacy intact.
                </p>
              </CardContent>
            </Card>

          </div>

          <div className="mt-12 pb-8">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <Link href="/terms-of-use" className="hover:text-blue-600 transition-colors">Terms of Use</Link>
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
