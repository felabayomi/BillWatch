import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { Badge } from "@finance/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@finance/components/ui/tabs";
import { ArrowLeft, Receipt, BookOpen, Plus, Calculator, PieChart, CreditCard, TrendingUp, CheckCircle, ArrowRight, HelpCircle, Shield, Database, Smartphone, Mail, AlertTriangle, Bug, Settings, RefreshCw } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";

export default function Help() {
  const [location, setLocation] = useLocation();
  const params = useParams();
  const [activeTab, setActiveTab] = useState("how-to-use");

  // Handle URL slug for deep linking
  useEffect(() => {
    const slug = params.slug;
    if (slug && ["how-to-use", "faq", "troubleshooting"].includes(slug)) {
      setActiveTab(slug);
    }
  }, [params.slug]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setLocation(`/help/${value}`);
  };

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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Help Center</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Find answers, guides, and support for FinanceWatch
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="how-to-use" data-testid="tab-how-to-use">How to Use</TabsTrigger>
              <TabsTrigger value="faq" data-testid="tab-faq">FAQ</TabsTrigger>
              <TabsTrigger value="troubleshooting" data-testid="tab-troubleshooting">Troubleshooting</TabsTrigger>
            </TabsList>

            {/* How to Use Tab */}
            <TabsContent value="how-to-use" className="space-y-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <CardTitle>Getting Started</CardTitle>
                    <Badge variant="secondary">Step 1</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Sign In & Initial Setup
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      Click "Sign In with Replit" on the landing page. Your account will be created automatically 
                      using your Replit credentials, ensuring secure authentication without additional passwords.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Tip:</strong> After signing in, you'll see the main dashboard. Start by adding 
                        your first account to begin tracking your finances.
                      </p>
                    </div>
                    <div className="mt-4">
                      <Link href="/help/how-to/getting-started">
                        <Button variant="outline" size="sm" className="flex items-center gap-2" data-testid="link-getting-started">
                          <ArrowRight className="h-4 w-4" />
                          Read Full Getting Started Guide
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Plus className="h-5 w-5 text-green-600" />
                    <CardTitle>Adding Your Accounts</CardTitle>
                    <Badge variant="secondary">Step 2</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Account Types You Can Track
                    </h4>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 mb-4">
                      <li><strong>Checking Accounts:</strong> Your primary spending accounts</li>
                      <li><strong>Savings Accounts:</strong> Emergency funds and savings goals</li>
                      <li><strong>Credit Cards:</strong> Track balances and payments</li>
                      <li><strong>Cash:</strong> Physical money you carry</li>
                      <li><strong>Investment Accounts:</strong> Retirement and investment portfolios</li>
                      <li><strong>Business Accounts:</strong> Separate business financial tracking</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      Adding an Account
                    </h4>
                    <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                      <li>Click "Add Account" button on the Accounts page</li>
                      <li>Enter account name (e.g., "Chase Checking", "Emergency Savings")</li>
                      <li>Select account type from the dropdown</li>
                      <li>Choose owner (Personal or Business)</li>
                      <li>Enter your current account balance</li>
                      <li>Add institution name (optional but recommended)</li>
                      <li>Set the opening date (usually today's date)</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    <CardTitle>Recording Transactions</CardTitle>
                    <Badge variant="secondary">Step 3</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Transaction Types
                    </h4>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 mb-4">
                      <li><strong>Income:</strong> Salary, freelance payments, investment returns</li>
                      <li><strong>Expenses:</strong> Groceries, utilities, entertainment, etc.</li>
                      <li><strong>Transfers:</strong> Moving money between your accounts</li>
                      <li><strong>Adjustments:</strong> Bank fees, interest, corrections</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      Recording a Transaction
                    </h4>
                    <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                      <li>Go to the Transactions page</li>
                      <li>Click "Add Transaction"</li>
                      <li>Select the account the transaction affects</li>
                      <li>Enter the transaction amount</li>
                      <li>Choose the appropriate category</li>
                      <li>Add a description for easy identification</li>
                      <li>Set the transaction date</li>
                      <li>Save the transaction</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-orange-600" />
                    <CardTitle>Daily Balance Reconciliation</CardTitle>
                    <Badge variant="secondary">Step 4</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Understanding Daily Balancing
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      The system automatically calculates your daily balances using this formula:
                    </p>
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm">
                      Opening Balance + Inflows - Outflows Â± Adjustments = Closing Balance
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mt-4">
                      Each day's opening balance equals the previous day's closing balance, ensuring mathematical continuity.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <PieChart className="h-5 w-5 text-red-600" />
                    <CardTitle>Reports & Analysis</CardTitle>
                    <Badge variant="secondary">Step 5</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Daily Summary Dashboard
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Your dashboard provides a complete financial overview:
                    </p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                      <li><strong>Account Balances:</strong> Current balances for all accounts</li>
                      <li><strong>Daily Changes:</strong> How much each account changed today</li>
                      <li><strong>Net Worth:</strong> Total assets minus liabilities</li>
                      <li><strong>Cash Flow:</strong> Income vs expenses for the period</li>
                      <li><strong>Recent Transactions:</strong> Latest financial activity</li>
                      <li><strong>Historical View:</strong> Use the date picker to view balances for any past date</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Cash Flow Analysis
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      The Cash Flow page automatically calculates your money movements:
                    </p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                      <li><strong>Daily View:</strong> See income and expenses for each day</li>
                      <li><strong>Monthly Summary:</strong> Track monthly spending patterns</li>
                      <li><strong>Yearly Overview:</strong> Annual cash flow for long-term planning</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-orange-600" />
                    <CardTitle>Tax Reports & Deductions</CardTitle>
                    <Badge variant="secondary">Step 6</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Tax Summary Tab
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      The Reports page includes a Tax Summary tab to help with filing:
                    </p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                      <li><strong>Year Selector:</strong> Choose the tax year you need</li>
                      <li><strong>Total Income:</strong> All income for the selected year</li>
                      <li><strong>Total Expenses:</strong> All deductible expenses</li>
                      <li><strong>Net Income:</strong> Calculated taxable income</li>
                      <li><strong>Expense Breakdown:</strong> Expenses organized by category</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-orange-600" />
                      Business Deductions Tab
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Track business expenses for deduction filing:
                    </p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                      <li><strong>Business Income:</strong> Total income from business accounts</li>
                      <li><strong>Business Expenses:</strong> All deductible business expenses</li>
                      <li><strong>Category Breakdown:</strong> Business expenses by category</li>
                      <li><strong>Business Accounts:</strong> List of all business accounts</li>
                    </ul>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg mt-4">
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        <strong>Tip:</strong> Make sure to mark your accounts as "Business" when creating them 
                        to have their transactions appear in the Business Deductions report.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="space-y-8">
              <div className="text-center mb-8">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Find answers to commonly asked questions about FinanceWatch
                </p>
                <Link href="/help/faq/common-questions">
                  <Button className="flex items-center gap-2" data-testid="link-faq-full">
                    <HelpCircle className="h-4 w-4" />
                    View Complete FAQ
                  </Button>
                </Link>
              </div>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                    <CardTitle>Getting Started</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How do I start tracking my finances?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Sign in with your Replit account, then add your accounts (checking, savings, credit cards, etc.) 
                      with their current balances. Start entering your daily transactions and the system will help you 
                      maintain accurate balances through daily reconciliation.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Do I need to connect my bank accounts?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      No! FinanceWatch is designed for manual entry, giving you complete control and awareness of every 
                      transaction. This manual approach helps you stay more engaged with your spending and provides 
                      better financial discipline.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I track multiple types of accounts?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Yes! Track checking accounts, savings accounts, credit cards, cash, investment accounts, and 
                      business accounts all in one place. The system handles both personal and business finances 
                      with proper accounting principles.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <CardTitle>Security & Privacy</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Is my financial data secure?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Absolutely. Your data is encrypted in transit and at rest using bank-level security. We never 
                      share your financial information with third parties, and only you can access your personal data. 
                      Authentication is handled securely through Replit.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Who can see my financial information?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Only you can see your financial data. Our staff cannot access your personal financial information 
                      without explicit authorization. Your data is isolated and protected by multiple security layers.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I export my data?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Yes, you can export your data at any time in standard formats. You have the right to data 
                      portability and can request permanent deletion of your account and all associated data if needed.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-purple-600" />
                    <CardTitle>Daily Balancing & Calculations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How does daily balance reconciliation work?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Each day, the system calculates your account balances using the formula: Opening Balance + 
                      Inflows - Outflows Â± Adjustments = Closing Balance. This ensures mathematical accuracy and 
                      helps you catch discrepancies early.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">What if my balance doesn't match my bank statement?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      The daily balancing feature helps you identify discrepancies quickly. Check for missing 
                      transactions, fees, or timing differences. You can make balance adjustments when needed and 
                      track down any differences systematically.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How do transfers between accounts work?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Transfers follow proper accounting principles with double-entry bookkeeping. When you transfer 
                      money between accounts, the system creates paired transactions that maintain balance accuracy 
                      across your entire financial picture.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-teal-600" />
                    <CardTitle>Mobile & Accessibility</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I use FinanceWatch on my phone?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Yes! FinanceWatch is a Progressive Web App (PWA) that works seamlessly on mobile devices. 
                      You can install it on your phone's home screen for quick access and offline capabilities.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Does it work offline?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      The app has offline capabilities for basic functionality. Your data syncs automatically 
                      when you're back online, ensuring you can track expenses even without an internet connection.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-red-600" />
                    <CardTitle>Support & Contact</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How do I get help if I have issues?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Contact us directly at{" "}
                      <a href="mailto:felix@debttolegacy.com" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        felix@debttolegacy.com
                      </a>{" "}
                      or visit our website at{" "}
                      <a href="https://debttolegacy.com/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        https://debttolegacy.com/
                      </a>{" "}
                      for support and assistance.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I suggest new features?</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      We'd love to hear your ideas! Send feature requests and suggestions to{" "}
                      <a href="mailto:felix@debttolegacy.com" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        felix@debttolegacy.com
                      </a>.
                      Your feedback helps us improve the platform for everyone.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Troubleshooting Tab */}
            <TabsContent value="troubleshooting" className="space-y-8">
              <div className="text-center mb-8">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Get help resolving common issues and technical problems
                </p>
                <Link href="/help/troubleshooting/common-issues">
                  <Button variant="secondary" className="flex items-center gap-2" data-testid="link-troubleshooting-full">
                    <AlertTriangle className="h-4 w-4" />
                    View Troubleshooting Guide
                  </Button>
                </Link>
              </div>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <CardTitle>Common Issues</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Bug className="h-4 w-4 text-red-600" />
                      App won't load or keeps showing loading screen
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      This usually indicates a connection issue or temporary server problem.
                    </p>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        <strong>Solution:</strong> Try refreshing the page, clearing your browser cache, or waiting a few minutes and trying again. 
                        If the problem persists, contact support.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                      Balances don't match my bank statements
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      Balance discrepancies can occur due to missing transactions, timing differences, or bank fees.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Solution:</strong> Check for missing transactions, verify all recent entries, look for bank fees or interest, 
                        and use the balance adjustment feature if needed to reconcile differences.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-purple-600" />
                    <CardTitle>Data & Sync Issues</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Missing transactions or data</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      If you're missing transactions or account data, this could be due to sync issues or accidental deletion.
                    </p>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        <strong>Solution:</strong> Try refreshing the page first. If data is still missing, check if you're logged into the correct account. 
                        Contact support for data recovery assistance if needed.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Cannot save transactions or accounts</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      If save operations are failing, this may be due to validation errors or connection issues.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Solution:</strong> Check that all required fields are filled out correctly, ensure amounts are valid numbers, 
                        and verify your internet connection. Try saving again after a few moments.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <CardTitle>Browser & Performance</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">App running slowly or unresponsive</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      Performance issues can be caused by browser cache, low memory, or too many open tabs.
                    </p>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        <strong>Solution:</strong> Close other browser tabs, clear your browser cache and cookies for this site, 
                        or try using a different browser. Restart your browser if needed.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Mobile app installation issues</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      Problems installing the PWA on mobile devices or home screen.
                    </p>
                    <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg">
                      <p className="text-sm text-teal-700 dark:text-teal-300">
                        <strong>Solution:</strong> For iPhone: Use Safari browser and tap the share button, then "Add to Home Screen". 
                        For Android: Use Chrome browser and look for the "Install app" prompt or "Add to Home Screen" in the menu.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-red-600" />
                    <CardTitle>Still Need Help?</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Contact Technical Support</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      If you're still experiencing issues after trying these solutions, our support team is here to help.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <strong>When contacting support, please include:</strong>
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>A description of the problem you're experiencing</li>
                          <li>What you were trying to do when the issue occurred</li>
                          <li>Your browser and device type</li>
                          <li>Any error messages you see</li>
                          <li>Screenshots if helpful</li>
                        </ul>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <a 
                          href="mailto:felix@debttolegacy.com"
                          className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          data-testid="button-contact-support"
                        >
                          Contact Support
                        </a>
                        <a 
                          href="https://debttolegacy.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                          data-testid="button-visit-website"
                        >
                          Visit Our Website
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-12 text-center">
            <Link href="/">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-home">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
