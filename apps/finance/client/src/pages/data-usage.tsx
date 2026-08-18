import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { ArrowLeft, Receipt, Database, Cloud, Brain, RefreshCw, Link2, ShieldCheck, Server, Eye, Lock } from "lucide-react";
import { Link } from "wouter";

export default function DataUsage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
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
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Data Usage</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              A plain-language explanation of exactly what data FinanceWatch stores, processes, and shares
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Last updated: February 27, 2026</p>
          </div>

          <div className="space-y-8">

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-blue-600" />
                  <CardTitle>What Data We Store</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  Everything you enter into FinanceWatch is stored securely in an encrypted PostgreSQL database hosted on Replit's infrastructure. This includes:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: "Accounts", desc: "Name, type, institution, owner, balance, linked business" },
                    { label: "Transactions", desc: "Date, amount, description, category, account, business flag" },
                    { label: "Businesses", desc: "Business names you've created for expense tracking" },
                    { label: "Categories", desc: "Your custom income/expense/bill categories" },
                    { label: "Bills", desc: "Recurring bill names, amounts, due dates, status" },
                    { label: "Transfers", desc: "Between-account transfer records" },
                    { label: "Daily Balances", desc: "Calculated opening/closing balances per account per day" },
                    { label: "Accountant Links", desc: "Tokens and filter settings for share links you generate" },
                  ].map(item => (
                    <div key={item.label} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Important:</strong> All monetary values are stored as whole cents (integers) â€” never floating-point numbers â€” to ensure mathematical precision in your balance calculations.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Cloud className="h-5 w-5 text-purple-600" />
                  <CardTitle>Receipt & Invoice File Storage</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  When you upload a receipt or invoice image (manually or via batch upload), the file is stored in <strong>Replit Object Storage</strong> â€” a secure cloud storage system tied to your account.
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                  <li>Files are stored privately and only accessible to your account</li>
                  <li>Receipt images are linked to specific transactions by a file path stored in the database</li>
                  <li>Accountant share links may expose receipt URLs if the transaction is within the shared scope â€” the accountant can view but not download or modify</li>
                  <li>You can delete any receipt by editing the associated transaction</li>
                </ul>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Only upload images and files that belong to you. Do not upload personal documents belonging to others without their consent.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-green-600" />
                  <CardTitle>AI Processing (Receipt Parsing)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  When you use the "Upload Receipt/Invoice" feature to auto-fill a transaction form, FinanceWatch sends the image to <strong>OpenAI's Vision API</strong> for analysis. Here is exactly what happens:
                </p>
                <div className="space-y-3">
                  {[
                    { step: "1", title: "Image sent to OpenAI", desc: "Your receipt image is transmitted securely to OpenAI's API over an encrypted connection." },
                    { step: "2", title: "Data extracted", desc: "OpenAI reads the image and returns structured data: amount, date, vendor name, and suggested category." },
                    { step: "3", title: "Form pre-filled", desc: "The extracted data is used to pre-fill your transaction form. You review and confirm before saving." },
                    { step: "4", title: "No training", desc: "Your data is sent under Replit's API agreement, which does not allow OpenAI to use your uploaded images for model training." },
                  ].map(item => (
                    <div key={item.step} className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-sm font-bold">{item.step}</span>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  OpenAI's data handling policies apply to this processing. See <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">openai.com/policies/privacy-policy</a> for details.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-orange-600" />
                  <CardTitle>Data Synced from Other Apps</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  FinanceWatch can receive transaction data pushed from three connected apps in the DTL ecosystem: <strong>ExpenseWatch</strong>, <strong>BillWatch</strong>, and <strong>IncomeLift</strong>. When a sync occurs:
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                  <li>The external app sends transaction details (amount, date, description, account name, category, and optionally a receipt) via a secure API call using your membership credentials</li>
                  <li>FinanceWatch matches the account by name and creates the transaction</li>
                  <li>If the account is linked to a specific business, that business is automatically assigned â€” you don't have to do it manually</li>
                  <li>Duplicate detection prevents the same transaction from being imported twice</li>
                  <li>Receipt images sent during sync are stored in the same secure object storage as manually uploaded receipts</li>
                </ul>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Only apps you've authorized through Felix Pay membership can push data to your FinanceWatch account. Third parties cannot sync data without your membership credentials.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Link2 className="h-5 w-5 text-teal-600" />
                  <CardTitle>Accountant Share Links</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  When you generate an accountant share link, a time-limited, token-based URL is created. Here's what that means for your data:
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                  <li>The link is scoped to the year and transaction type you chose at generation time â€” the accountant cannot expand beyond that scope</li>
                  <li>Data visible through the link: transactions (including description, amount, date, category, account name, business flag), category spending totals, account names, and receipt links where applicable</li>
                  <li>The link is read-only â€” the accountant cannot edit, delete, or add anything</li>
                  <li>No login is required to view the link, so anyone with the URL can see the scoped data</li>
                  <li>You can revoke any link at any time from the Reports page â€” it becomes inaccessible immediately</li>
                  <li>Share links do not expose your account balances, opening balances, personal ID, or anything outside the chosen year/type</li>
                </ul>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Treat share links like a document.</strong> Anyone who has the link URL can view the scoped financial data until you revoke it. Only share with people you trust.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  <CardTitle>Authentication & Identity</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  FinanceWatch uses <strong>Felix Pay Single Sign-On (SSO)</strong> via Replit Auth for authentication. When you log in:
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                  <li>Your identity (user ID, email) is provided by the SSO provider â€” we do not store passwords</li>
                  <li>Your user ID is used to scope all data in the database â€” no one else can access your data</li>
                  <li>Sessions are managed securely using server-side session cookies</li>
                  <li>Your membership tier is verified with Felix Pay on each login</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-gray-600" />
                  <CardTitle>Infrastructure & Third-Party Services</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 font-semibold text-gray-900 dark:text-white">Service</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-900 dark:text-white">Purpose</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-900 dark:text-white">Data Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-300">
                      <tr>
                        <td className="py-3 px-2 font-medium">Replit (Hosting)</td>
                        <td className="py-3 px-2">App hosting, database, file storage</td>
                        <td className="py-3 px-2">All app data</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-medium">OpenAI</td>
                        <td className="py-3 px-2">Receipt/invoice image parsing</td>
                        <td className="py-3 px-2">Receipt images only (when you use the upload feature)</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-medium">Felix Pay (SSO)</td>
                        <td className="py-3 px-2">Authentication & membership verification</td>
                        <td className="py-3 px-2">User ID, email, membership status</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-medium">Neon Database</td>
                        <td className="py-3 px-2">Serverless PostgreSQL hosting</td>
                        <td className="py-3 px-2">All financial records (encrypted)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-red-600" />
                  <CardTitle>What We Do NOT Do</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[
                    "Sell your financial data to any third party",
                    "Use your data for advertising or marketing profiling",
                    "Share your data with other FinanceWatch users",
                    "Allow staff to view your financial records without explicit authorization",
                    "Store your bank login credentials or connect to your bank directly",
                    "Use your receipt images to train AI models",
                    "Send you unsolicited marketing emails",
                  ].map(item => (
                    <li key={item} className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                      <Lock className="h-4 w-4 text-red-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-blue-100">Questions About Your Data?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-blue-800 dark:text-blue-200">
                  If you have any questions about how your data is stored or used, or would like to request deletion of your account data, contact us:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="mailto:felix@debttolegacy.com" className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    felix@debttolegacy.com
                  </a>
                  <a href="https://debttolegacy.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors text-sm font-medium">
                    Visit Debt to Legacy LLC
                  </a>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="mt-12 pb-8">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <Link href="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms-of-use" className="hover:text-blue-600 transition-colors">Terms of Use</Link>
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
