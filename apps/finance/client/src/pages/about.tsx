import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Receipt, User, Target, Shield, Heart, Mail, ExternalLink, Briefcase, CheckCircle } from "lucide-react";
import { Link } from "wouter";

const frameworkItems = [
  { letter: "F", label: "Felix", detail: "Pay + CheckBook" },
  { letter: "I", label: "IncomeLift", detail: "" },
  { letter: "S", label: "SteadyVest + SavingsPro", detail: "" },
  { letter: "T", label: "Track", detail: "ExpenseWatch + WealthWatch" },
  { letter: "E", label: "ExpenseWatch", detail: "spend awareness" },
  { letter: "D", label: "DIY Debt", detail: "" },
  { letter: "W", label: "WealthWatch", detail: "cash flow & net worth trends" },
  { letter: "E", label: "Ecosystem", detail: "FinanceWatch as the unified view" },
  { letter: "A", label: "All-in-one", detail: "" },
  { letter: "L", label: "Lifecycle", detail: "" },
  { letter: "T", label: "Tools", detail: "BillWatch included" },
  { letter: "H", label: "Hub", detail: "" },
];

export default function About() {
  const [frameworkOpen, setFrameworkOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center gap-2" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white">FinanceWatch MoneyTracker</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">About FinanceWatch</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Comprehensive personal finance tracking for your journey to financial freedom
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-blue-600" />
                  <CardTitle>Our Mission</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  FinanceWatch MoneyTracker is designed to give you complete control over your financial life. 
                  We believe that manual tracking and daily balancing provides the deepest understanding of your 
                  money flow, helping you make better financial decisions every day.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Built by Debt to Legacy LLC, FinanceWatch is part of the DTL Navigation Tools suite and the 
                  Felix Financial OS — helping individuals move from financial stress to long-term stability 
                  and legacy creation through practical, hands-on financial management tools.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <CardTitle>What Makes Us Different</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Manual Precision</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Unlike automated tools, our manual approach ensures you're actively engaged with every 
                    dollar, leading to better financial awareness and decision-making.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Daily Balance Verification</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Mathematical precision with daily balance reconciliation ensures your records match 
                    reality, helping you catch discrepancies early and maintain accurate financial records.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Complete Account Coverage</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Track all your accounts - checking, savings, credit cards, cash, investments, and business 
                    accounts - all in one comprehensive platform using proper accounting principles.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Privacy First</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Your financial data stays private and secure. We never share your information with 
                    third parties, and you maintain complete control over your data.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <CardTitle>What FinanceWatch Can Do</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    "Track checking, savings, credit, cash, investment, loan & mortgage accounts",
                    "Manual transaction entry with daily balance reconciliation",
                    "Upload receipts and invoices — AI reads them and fills your form automatically",
                    "Batch import multiple receipts at once",
                    "Track bills and recurring payments",
                    "Double-entry transfers between accounts",
                    "Multi-business support — assign expenses to specific companies",
                    "Automatically link accounts to businesses for sync auto-assignment",
                    "Sync transactions from ExpenseWatch, BillWatch, and IncomeLift",
                    "QuickBooks-style reports: Income Statement, Tax Report, Balance Sheet, Cash Flow",
                    "Personal vs. business transaction flagging",
                    "Read-only accountant share links — scoped by year and type",
                    "Receipts visible to your accountant through the share link",
                    "Mobile-friendly, installable as a PWA",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-purple-600" />
                  <CardTitle>Perfect For</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                  <li>Individuals wanting complete control over their financial tracking</li>
                  <li>Small business owners managing both personal and business finances</li>
                  <li>People who prefer manual entry for better financial awareness</li>
                  <li>Those seeking mathematical precision in their financial records</li>
                  <li>Users who want a comprehensive view of all their assets and liabilities</li>
                  <li>Anyone working toward debt elimination and wealth building</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-red-600" />
                  <CardTitle>Built by Debt to Legacy LLC</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  Debt to Legacy LLC is a personal finance and wealth-building company designed to help individuals 
                  move from financial stress to long-term stability and legacy creation.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Through DTL Navigation Tools, our suite of connected financial applications, clients gain clear 
                  visibility and control over every aspect of their financial lives — from income and spending to 
                  debt elimination, saving, investing, and wealth tracking.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  These tools are unified by the Felix Financial OS, our underlying financial operating system that 
                  ensures every decision works together as part of one cohesive plan. The entire ecosystem is built 
                  on the{" "}
                  <button
                    onClick={() => setFrameworkOpen(true)}
                    className="inline font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline underline-offset-2 decoration-dotted cursor-pointer transition-colors"
                  >
                    F.I.S.T.E.D. W.E.A.L.T.H. framework
                  </button>
                  , a disciplined financial lifecycle that guides users 
                  step by step from income to wealth:
                </p>
                <p className="font-semibold text-gray-900 dark:text-white text-center">
                  Income → Spend → Track → Eliminate Debt → Save → Invest → Build Wealth → Create Legacy
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  We don't believe in quick fixes or fragmented advice. We believe in systems, clarity, and 
                  consistency — one system, guiding every money decision, for a lifetime.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-indigo-600" />
                  <CardTitle>Complete Financial Suite</CardTitle>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Explore our comprehensive range of financial tools and services
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 font-semibold text-gray-900 dark:text-white">App</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-900 dark:text-white">Description</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-900 dark:text-white">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">IncomeLift</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">Boost your income streams</td>
                        <td className="py-3 px-2">
                          <a href="https://incomelift.co/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">SteadyVest</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">Steady growth investing</td>
                        <td className="py-3 px-2">
                          <a href="https://steadyvest.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">BillWatch</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">Smart bill management</td>
                        <td className="py-3 px-2">
                          <a href="https://billwatch.pro/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">DIY Debt</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">Debt elimination strategies</td>
                        <td className="py-3 px-2">
                          <a href="https://diydebt.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">Felix Pay</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">Secure payment solutions</td>
                        <td className="py-3 px-2">
                          <a href="https://felixpay.net/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">ExpenseWatch</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">Advanced expense tracking</td>
                        <td className="py-3 px-2">
                          <a href="https://expensewatch.pro/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                      <tr className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600">
                        <td className="py-3 px-2 font-medium text-blue-700 dark:text-blue-300">FinanceWatch (You're Here)</td>
                        <td className="py-3 px-2 text-blue-600 dark:text-blue-400">Complete financial overview</td>
                        <td className="py-3 px-2">
                          <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 font-medium">
                            Current App
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">Felix CheckBook</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">Check printing & mailing service</td>
                        <td className="py-3 px-2">
                          <a href="https://felixcheck.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">SavingsPro</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">Smart savings strategies</td>
                        <td className="py-3 px-2">
                          <a href="https://savingspro.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">WealthWatch</td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">Track Your Cash Flow, Build Your Wealth</td>
                        <td className="py-3 px-2">
                          <a href="https://wealth-watch.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-teal-600" />
                  <CardTitle>Get in Touch</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  Have questions, suggestions, or need support? We'd love to hear from you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a 
                    href="mailto:felix@debttolegacy.com"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    data-testid="button-contact-email"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    felix@debttolegacy.com
                  </a>
                  <a 
                    href="https://debttolegacy.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid="button-visit-website"
                  >
                    Visit Our Website
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 pb-8">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <Link href="/how-to-use" className="hover:text-blue-600 transition-colors">How to Use</Link>
              <Link href="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms-of-use" className="hover:text-blue-600 transition-colors">Terms of Use</Link>
              <Link href="/data-usage" className="hover:text-blue-600 transition-colors">Data Usage</Link>
            </div>
            <div className="text-center">
              <Link href="/">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-home">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={frameworkOpen} onOpenChange={setFrameworkOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl">The F.I.S.T.E.D. W.E.A.L.T.H. Framework</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              The foundation behind DTL Navigation Tools
            </p>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] space-y-2 mt-2 pr-1">
            {frameworkItems.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-md flex items-center justify-center font-bold text-sm">
                  {item.letter}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{item.label}</span>
                  {item.detail && (
                    <span className="text-sm text-muted-foreground ml-1">({item.detail})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}