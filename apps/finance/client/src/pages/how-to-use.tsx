import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Receipt, BookOpen, Plus, Calculator, PieChart, CreditCard, TrendingUp, CheckCircle, ArrowRight, Building2, Upload, Link2, RefreshCw, FileText, BarChart3, Users } from "lucide-react";
import { Link } from "wouter";

const steps = [
  {
    icon: BookOpen,
    color: "text-blue-600",
    title: "Sign In",
    badge: "Step 1",
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          FinanceWatch uses <strong>Felix Pay Single Sign-On</strong>. Click "Sign In with SSO" on the home page. Your account is created automatically using your Felix Pay membership credentials — no separate password needed.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Membership required.</strong> Access requires an active Felix Pay membership. Visit <a href="https://felixpay.net/membership" className="underline hover:text-blue-500">felixpay.net/membership</a> to sign up.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: Building2,
    color: "text-purple-600",
    title: "Set Up Your Businesses",
    badge: "Step 2",
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          If you have business expenses to track, go to <strong>Businesses</strong> in the sidebar and create each of your businesses. You can have as many as you need.
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          Once businesses are set up, you can link individual accounts directly to a specific business — so any transaction synced on that account is automatically assigned to the right company without manual intervention.
        </p>
      </div>
    ),
  },
  {
    icon: Plus,
    color: "text-green-600",
    title: "Add Your Accounts",
    badge: "Step 3",
    content: (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Account Types You Can Track
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
            {["Checking", "Savings", "Credit Card", "Cash", "Investment / Rewards", "Business Checking", "Loans & Mortgage", "HELOC / Auto Loan"].map(t => (
              <div key={t} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0"></div>
                {t}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-blue-600" />
            To add an account:
          </h4>
          <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
            <li>Go to Accounts → Add Account</li>
            <li>Enter the account name and institution</li>
            <li>Choose account type and owner (Personal or Business)</li>
            <li>If business, select which business it belongs to from the dropdown</li>
            <li>Enter your current balance and opening date</li>
          </ol>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Tip:</strong> Linking a business account to a specific business means any transaction synced from ExpenseWatch, BillWatch, or IncomeLift on that account is automatically flagged for the correct business — no manual work.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: CreditCard,
    color: "text-indigo-600",
    title: "Record Transactions",
    badge: "Step 4",
    content: (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Transaction Types
          </h4>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
            <li><strong>Income:</strong> Salary, freelance, investment returns, refunds</li>
            <li><strong>Expenses:</strong> Groceries, utilities, subscriptions, business costs</li>
            <li><strong>Bill Payments:</strong> Rent, insurance, loan payments</li>
            <li><strong>Transfers:</strong> Moving money between your own accounts</li>
            <li><strong>Adjustments:</strong> Bank fees, interest charges, corrections</li>
            <li><strong>Investments:</strong> Contributions, withdrawals, dividends</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-blue-600" />
            Business & Personal Flags
          </h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Any transaction — even on a personal account — can be marked as a business expense and assigned to a specific business. Use the "Mark as Personal" flag to exclude transactions from business reports.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: Upload,
    color: "text-teal-600",
    title: "Upload Receipts & Invoices",
    badge: "Step 5",
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          When adding or editing a transaction, you can upload a receipt or invoice image. The AI will read the image and automatically fill in the amount, date, description, and suggested category for you.
        </p>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-blue-600" />
            Batch Receipt Upload
          </h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Have a stack of receipts? Use Batch Upload to import multiple receipts at once. The AI reads each one and creates a draft transaction — you review and confirm before they're saved. Multiple receipts can also be attached to a single transaction.
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            <strong>Tip:</strong> Receipt images are securely stored and remain linked to their transaction. Your accountant can view them through the share link if you choose to include those transactions in the share scope.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: FileText,
    color: "text-orange-600",
    title: "Track Bills",
    badge: "Step 6",
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          The Bills section tracks your recurring obligations — rent, utilities, insurance, subscriptions, loan payments, and more. Set up each bill with its amount, due date, and the account it's paid from.
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
          <li>Mark bills as paid when you make a payment</li>
          <li>The dashboard shows which bills are upcoming or overdue</li>
          <li>Bill payments are recorded as transactions automatically</li>
          <li>Business bills can be flagged and assigned to a specific business</li>
        </ul>
      </div>
    ),
  },
  {
    icon: RefreshCw,
    color: "text-blue-600",
    title: "Manage Transfers",
    badge: "Step 7",
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          Transfers move money between your own accounts (e.g., from checking to savings, or paying a credit card). FinanceWatch uses proper double-entry accounting — a transfer creates paired transactions (debit + credit) so your net worth stays accurate.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <strong>Example:</strong> Paying your Chase credit card from your Chase checking — the checking goes down and the credit card balance decreases. Both sides are recorded automatically.
        </div>
      </div>
    ),
  },
  {
    icon: Calculator,
    color: "text-red-600",
    title: "Daily Balance Reconciliation",
    badge: "Step 8",
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          FinanceWatch automatically calculates your daily balance for every account using the formula:
        </p>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm text-center">
          Opening Balance + Income − Expenses ± Adjustments = Closing Balance
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Each day's opening balance equals the previous day's closing balance — mathematical continuity you can rely on. If a balance doesn't match your bank, use the Balance Correction tool to log the adjustment.
        </p>
      </div>
    ),
  },
  {
    icon: BarChart3,
    color: "text-purple-600",
    title: "Reports & Financial Statements",
    badge: "Step 9",
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          The Reports section gives you QuickBooks-style financial visibility:
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { title: "Income Statement", desc: "Income vs. expenses over any period" },
            { title: "Tax Report", desc: "Business expenses grouped by category for tax filing" },
            { title: "Category Breakdown", desc: "Where your money goes, visualized" },
            { title: "Cash Flow", desc: "Day-by-day and month-by-month cash movement" },
            { title: "Balance Sheet", desc: "All assets and liabilities at a glance — personal and business" },
            { title: "Account Transactions", desc: "Full ledger for any account" },
          ].map(r => (
            <div key={r.title} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-sm text-gray-900 dark:text-white">{r.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Users,
    color: "text-teal-600",
    title: "Share with Your Accountant",
    badge: "Step 10",
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          Go to <strong>Reports → Share Tab</strong> to generate a read-only link for your accountant or tax preparer. You control exactly what they can see:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
          <li>Choose a specific year (e.g., 2025) or all years</li>
          <li>Scope to business only, personal only, or all transactions</li>
          <li>Receipts and invoices are viewable through the link</li>
          <li>The link is read-only — your accountant cannot change anything</li>
          <li>Revoke the link at any time to cut off access immediately</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Link2,
    color: "text-gray-600",
    title: "Sync from ExpenseWatch, BillWatch & IncomeLift",
    badge: "Step 11",
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          If you use other apps in the Felix ecosystem, they can push transactions directly into FinanceWatch:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
          <li><strong>ExpenseWatch →</strong> syncs expense transactions</li>
          <li><strong>BillWatch →</strong> syncs bill payments</li>
          <li><strong>IncomeLift →</strong> syncs income transactions</li>
        </ul>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Synced transactions land on the correct account automatically. If that account is linked to a business, the business is assigned without any manual work. Receipts from the external apps are also stored and linked.
        </p>
      </div>
    ),
  },
];

export default function HowToUse() {
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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">How to Use FinanceWatch</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              A complete walkthrough of every feature — from setup to sharing with your accountant
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${step.color}`} />
                      <CardTitle>{step.title}</CardTitle>
                      <Badge variant="secondary">{step.badge}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>{step.content}</CardContent>
                </Card>
              );
            })}

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-blue-100">Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-800 dark:text-blue-200 mb-4">
                  Have questions or need support? We're here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="mailto:felix@debttolegacy.com" className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Email Support
                  </a>
                  <a href="https://debttolegacy.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors text-sm font-medium">
                    Visit Our Website
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 pb-8">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <Link href="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms-of-use" className="hover:text-blue-600 transition-colors">Terms of Use</Link>
              <Link href="/data-usage" className="hover:text-blue-600 transition-colors">Data Usage</Link>
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
