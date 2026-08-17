import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Receipt, HelpCircle, Shield, CreditCard, Calculator, Database, Smartphone, Mail } from "lucide-react";
import { Link } from "wouter";

export default function FAQ() {
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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Common questions about FinanceWatch MoneyTracker
            </p>
          </div>

          <div className="space-y-8">
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
                    Inflows - Outflows ± Adjustments = Closing Balance. This ensures mathematical accuracy and 
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
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  <CardTitle>Accounts & Categories</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I customize transaction categories?</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Yes! Create custom categories that match your spending patterns. The system supports both 
                    expense and income categories, helping you track where your money comes from and where it goes.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How do I track bills and recurring payments?</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Use the bill tracking feature to monitor recurring payments like rent, utilities, and 
                    subscriptions. Set up bill reminders and track payment history to stay on top of your 
                    regular expenses.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I separate personal and business expenses?</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Absolutely! The system supports both personal and business accounts, allowing you to maintain 
                    separate financial records while viewing everything in one comprehensive dashboard.
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
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Is there a dark mode?</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Yes! FinanceWatch supports both light and dark themes that automatically adapt to your 
                    device preferences or can be manually toggled for comfortable viewing in any lighting condition.
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
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Is there a user guide or tutorial?</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Yes! Check out our comprehensive "How to Use" guide that walks you through all features 
                    step by step, from setting up your first account to advanced reporting and reconciliation.
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
          </div>

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