import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, BookOpen, HelpCircle, AlertTriangle, FileText, CreditCard, Settings, TrendingUp, ArrowLeftRight, Receipt, PieChart, Briefcase } from "lucide-react"
import { Link } from "wouter"

// Import our new help components
import { HelpLayout, HelpSearch, HelpAccordion, Callout, Step } from "@/components"
import type { HelpSection, SearchableItem, FAQItem } from "@/components"

export default function HelpDemo() {
  // Example data for the help components
  const helpSections: HelpSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      href: "/help-demo/getting-started",
      icon: BookOpen,
      subsections: [
        { id: "setup", title: "Initial Setup", href: "/help-demo/getting-started#setup" },
        { id: "first-steps", title: "First Steps", href: "/help-demo/getting-started#first-steps" }
      ]
    },
    {
      id: "accounts",
      title: "Managing Accounts",
      href: "/help-demo/accounts",
      icon: CreditCard,
      subsections: [
        { id: "add-account", title: "Adding Accounts", href: "/help-demo/accounts#add-account" },
        { id: "edit-account", title: "Editing Accounts", href: "/help-demo/accounts#edit-account" },
        { id: "account-types", title: "Account Types", href: "/help-demo/accounts#account-types" }
      ]
    },
    {
      id: "transactions",
      title: "Transactions",
      href: "/help-demo/transactions",
      icon: Receipt,
      subsections: [
        { id: "income", title: "Recording Income", href: "/help-demo/transactions#income" },
        { id: "expenses", title: "Recording Expenses", href: "/help-demo/transactions#expenses" },
        { id: "bills", title: "Bill Payments", href: "/help-demo/transactions#bills" },
        { id: "business-expenses", title: "Business Expenses", href: "/help-demo/transactions#business-expenses" }
      ]
    },
    {
      id: "transfers",
      title: "Transfers",
      href: "/help-demo/transfers",
      icon: ArrowLeftRight,
      subsections: [
        { id: "create-transfer", title: "Creating Transfers", href: "/help-demo/transfers#create-transfer" },
        { id: "transfer-rules", title: "How Transfers Work", href: "/help-demo/transfers#transfer-rules" }
      ]
    },
    {
      id: "cash-flow",
      title: "Cash Flow",
      href: "/help-demo/cash-flow",
      icon: TrendingUp,
      subsections: [
        { id: "daily-summary", title: "Daily Summary", href: "/help-demo/cash-flow#daily-summary" },
        { id: "weekly-monthly", title: "Weekly & Monthly", href: "/help-demo/cash-flow#weekly-monthly" },
        { id: "understanding-totals", title: "Understanding Totals", href: "/help-demo/cash-flow#understanding-totals" }
      ]
    },
    {
      id: "reports",
      title: "Reports & Balance Sheet",
      href: "/help-demo/reports",
      icon: PieChart,
      subsections: [
        { id: "balance-sheet", title: "Balance Sheet", href: "/help-demo/reports#balance-sheet" },
        { id: "tax-reports", title: "Tax Reports", href: "/help-demo/reports#tax-reports" },
        { id: "business-deductions", title: "Business Deductions", href: "/help-demo/reports#business-deductions" }
      ]
    },
    {
      id: "faq",
      title: "FAQ",
      href: "/help-demo/faq",
      icon: HelpCircle
    },
    {
      id: "troubleshooting", 
      title: "Troubleshooting",
      href: "/help-demo/troubleshooting",
      icon: AlertTriangle
    }
  ]

  const searchItems: SearchableItem[] = [
    {
      id: "how-to-add-account",
      title: "How to add a new account",
      content: "Learn how to add checking, savings, and credit card accounts to track your finances effectively.",
      type: "guide",
      href: "/help-demo/accounts#add-account",
      section: "Managing Accounts",
      keywords: ["account", "add", "create", "new", "setup"]
    },
    {
      id: "balance-reconciliation",
      title: "Daily balance reconciliation",
      content: "Understand how the daily balance reconciliation works to keep your accounts accurate.",
      type: "guide", 
      href: "/help-demo/getting-started#reconciliation",
      section: "Getting Started",
      keywords: ["balance", "reconciliation", "daily", "accuracy"]
    },
    {
      id: "business-expense-marking",
      title: "Mark transactions as business expenses",
      content: "Learn how to mark individual transactions as business expenses for tax deduction tracking, even from personal accounts.",
      type: "guide",
      href: "/help-demo/transactions#business-expenses",
      section: "Transactions",
      keywords: ["business", "expense", "tax", "deduction", "mark", "personal"]
    },
    {
      id: "cash-flow-tracking",
      title: "Understanding Cash Flow",
      content: "Track your daily, weekly, monthly, and yearly cash flow. See income, expenses, and bills separately.",
      type: "guide",
      href: "/help-demo/cash-flow#understanding-totals",
      section: "Cash Flow",
      keywords: ["cash flow", "income", "expenses", "bills", "daily", "weekly", "monthly"]
    },
    {
      id: "transfers-between-accounts",
      title: "Transfers between accounts",
      content: "Learn how to transfer money between your accounts. Transfers don't count as income or expenses in cash flow.",
      type: "guide",
      href: "/help-demo/transfers#transfer-rules",
      section: "Transfers",
      keywords: ["transfer", "move money", "between accounts", "internal"]
    },
    {
      id: "bills-vs-expenses",
      title: "Bills vs Regular Expenses",
      content: "Understand the difference between bills and regular expenses. Bills are recurring payments like rent, utilities, and subscriptions.",
      type: "guide",
      href: "/help-demo/transactions#bills",
      section: "Transactions",
      keywords: ["bill", "expense", "recurring", "rent", "utilities", "subscription"]
    },
    {
      id: "balance-sheet-overview",
      title: "Balance Sheet explained",
      content: "View your total assets, liabilities, and net worth. Assets include checking, savings, cash, and investments. Liabilities include credit cards and loans.",
      type: "guide",
      href: "/help-demo/reports#balance-sheet",
      section: "Reports",
      keywords: ["balance sheet", "assets", "liabilities", "net worth", "wealth"]
    },
    {
      id: "tax-deductions-report",
      title: "Tax deductions and business expenses report",
      content: "Generate reports showing all your business expenses for tax purposes. Includes both business account transactions and individually marked business expenses.",
      type: "guide",
      href: "/help-demo/reports#business-deductions",
      section: "Reports",
      keywords: ["tax", "deduction", "business", "report", "IRS", "write-off"]
    },
    {
      id: "faq-security",
      title: "Is my data secure?",
      content: "Your financial data is encrypted and protected with bank-level security measures.",
      type: "faq",
      href: "/help-demo/faq#security",
      section: "Security & Privacy",
      keywords: ["security", "privacy", "encrypted", "safe"]
    },
    {
      id: "troubleshoot-loading",
      title: "App won't load",
      content: "Troubleshoot issues when the application fails to load or shows a blank screen.",
      type: "troubleshooting",
      href: "/help-demo/troubleshooting#loading",
      section: "Common Issues",
      keywords: ["loading", "blank", "error", "won't load"]
    }
  ]

  const faqItems: FAQItem[] = [
    {
      id: "getting-started-basics",
      question: "How do I get started with FinanceWatch?",
      answer: "Sign in with your Replit account, add your first account with its current balance, and start tracking your daily transactions.",
      category: "Getting Started",
      type: "general",
      tags: ["beginner", "setup"],
      isNew: true
    },
    {
      id: "data-security",
      question: "Is my financial data secure?",
      answer: "Absolutely! Your data is encrypted in transit and at rest using bank-level security. We never share your information with third parties.",
      category: "Security & Privacy",
      type: "general",
      tags: ["security", "privacy", "encryption"],
      isImportant: true
    },
    {
      id: "account-types",
      question: "What types of accounts can I track?",
      answer: "You can track checking accounts, savings accounts, credit cards, cash, investment accounts, and business accounts all in one place.",
      category: "Account Management",
      type: "general",
      tags: ["accounts", "types"]
    },
    {
      id: "business-expense-faq",
      question: "How do I mark a transaction as a business expense?",
      answer: "When adding an expense or bill payment, check the 'Business Expense' box in the orange-highlighted section. You can also edit existing transactions to mark them as business expenses. These will appear in your tax reports under Business Deductions.",
      category: "Transactions",
      type: "general",
      tags: ["business", "expense", "tax", "deduction"],
      isNew: true
    },
    {
      id: "transfers-cash-flow",
      question: "Why don't transfers show in my Cash Flow?",
      answer: "Transfers between your own accounts are not income or expenses - they're just moving money around. Cash Flow only shows actual money coming in (income) or going out (expenses/bills). This prevents your totals from being artificially inflated.",
      category: "Cash Flow",
      type: "general",
      tags: ["transfer", "cash flow", "income", "expense"],
      isImportant: true
    },
    {
      id: "bills-vs-expenses-faq",
      question: "What's the difference between Bills and Expenses?",
      answer: "Bills are recurring payments like rent, utilities, insurance, and subscriptions. Expenses are one-time purchases like groceries, dining, or shopping. They're tracked separately in your Cash Flow so you can see your fixed costs vs variable spending.",
      category: "Transactions",
      type: "general",
      tags: ["bills", "expenses", "recurring", "categories"]
    },
    {
      id: "balance-sheet-faq",
      question: "What is the Balance Sheet?",
      answer: "The Balance Sheet shows your total financial picture: Assets (checking, savings, cash, investments) minus Liabilities (credit cards, loans, mortgages) equals your Net Worth. It updates automatically as you record transactions.",
      category: "Reports",
      type: "general",
      tags: ["balance sheet", "assets", "liabilities", "net worth"]
    },
    {
      id: "assets-liabilities-faq",
      question: "What counts as an Asset vs a Liability?",
      answer: "Assets are accounts where you own money: checking, savings, cash, and investment accounts. Liabilities are accounts where you owe money: credit cards, personal loans, mortgages, auto loans, student loans, and HELOCs.",
      category: "Reports",
      type: "general",
      tags: ["assets", "liabilities", "account types"]
    },
    {
      id: "tax-report-faq",
      question: "How do I generate a tax report for business expenses?",
      answer: "Go to the Reports page and scroll to the Business Deductions section. This shows all transactions from business category accounts plus any individual transactions you've marked as business expenses. Use this for tax preparation.",
      category: "Reports",
      type: "general",
      tags: ["tax", "report", "business", "deduction", "IRS"],
      isNew: true
    },
    {
      id: "mobile-support",
      question: "Can I use this on my phone?",
      answer: "Yes! FinanceWatch is a Progressive Web App (PWA) that works seamlessly on mobile devices. You can install it on your phone's home screen.",
      category: "Technical",
      type: "technical",
      tags: ["mobile", "pwa", "responsive"]
    },
    {
      id: "export-data",
      question: "Can I export my financial data?",
      answer: "Yes, you can export your data at any time in standard formats. You have full control over your data and can request deletion if needed.",
      category: "Data Management",
      type: "technical",
      tags: ["export", "data", "backup"]
    }
  ]

  const [activeTab, setActiveTab] = useState("layout")

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/help">
                <Button variant="ghost" size="sm" className="flex items-center gap-2" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Help
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white">Help Components Demo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Help UI Components</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Comprehensive help components with search, layout, callouts, steps, and FAQs
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="layout" data-testid="tab-layout">Layout</TabsTrigger>
              <TabsTrigger value="search" data-testid="tab-search">Search</TabsTrigger>
              <TabsTrigger value="callouts" data-testid="tab-callouts">Callouts</TabsTrigger>
              <TabsTrigger value="steps" data-testid="tab-steps">Steps</TabsTrigger>
              <TabsTrigger value="faq" data-testid="tab-faq">FAQ</TabsTrigger>
            </TabsList>

            {/* Layout Demo */}
            <TabsContent value="layout" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>HelpLayout Component</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Responsive layout with sticky TOC on desktop and mobile sheet. Try resizing your window to see the responsive behavior.
                  </p>
                  
                  <div className="border rounded-lg overflow-hidden" style={{ height: "500px" }}>
                    <HelpLayout
                      sections={helpSections}
                      title="Help Center"
                      description="Find answers, guides, and support"
                    >
                      <div className="space-y-6">
                        <Callout variant="info" title="Welcome">
                          This is a demo of the HelpLayout component. The table of contents on the left 
                          is sticky on desktop and becomes a mobile sheet on smaller screens.
                        </Callout>
                        
                        <h2 className="text-2xl font-bold">Getting Started Guide</h2>
                        <p>
                          This layout provides a professional help center experience with proper navigation 
                          and responsive design. The TOC automatically highlights the current section.
                        </p>
                        
                        <h3 className="text-xl font-semibold">Key Features</h3>
                        <ul className="list-disc list-inside space-y-2">
                          <li>Sticky TOC on desktop screens</li>
                          <li>Mobile-friendly sheet navigation</li>
                          <li>Deep linking support</li>
                          <li>Dark mode compatibility</li>
                        </ul>
                      </div>
                    </HelpLayout>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Search Demo */}
            <TabsContent value="search" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>HelpSearch Component</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Fuzzy search with Fuse.js, keyboard navigation, and result highlighting.
                  </p>
                  
                  <div className="space-y-4">
                    <HelpSearch 
                      items={searchItems}
                      placeholder="Try searching for 'account', 'security', or 'loading'..."
                      className="max-w-lg"
                    />
                    
                    <Callout variant="tip" title="Search Tips">
                      Try searching for terms like "account", "security", "balance", or "loading". 
                      Use ↑↓ arrow keys to navigate results and Enter to select.
                    </Callout>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div>
                        <h4 className="font-semibold mb-2">Features:</h4>
                        <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                          <li>• Fuzzy search with Fuse.js</li>
                          <li>• Keyboard navigation (↑↓)</li>
                          <li>• Result highlighting</li>
                          <li>• Deep linking with URL params</li>
                          <li>• Type-based categorization</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Sample Data:</h4>
                        <div className="text-sm space-y-1">
                          {searchItems.slice(0, 3).map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              <span className="text-gray-600 dark:text-gray-300">{item.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Callouts Demo */}
            <TabsContent value="callouts" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Callout Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Callout components for tips, warnings, info blocks, and more.
                  </p>
                  
                  <div className="space-y-4">
                    <Callout variant="info" title="Information">
                      This is an informational callout. Perfect for providing additional context or details.
                    </Callout>

                    <Callout variant="tip" title="Pro Tip">
                      Tips help users learn best practices and discover helpful features they might miss.
                    </Callout>

                    <Callout variant="warning" title="Important Warning">
                      Warnings alert users to potential issues or important considerations before proceeding.
                    </Callout>

                    <Callout variant="danger" title="Critical Error">
                      Danger callouts highlight critical errors or destructive actions that need immediate attention.
                    </Callout>

                    <Callout variant="success" title="Success!">
                      Success callouts confirm completed actions and positive outcomes.
                    </Callout>

                    <Callout variant="default">
                      Default callout without a title. Useful for general content that needs emphasis.
                    </Callout>

                    <Callout variant="info" icon={false} title="Without Icon">
                      You can also disable the icon if you prefer a cleaner look.
                    </Callout>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Steps Demo */}
            <TabsContent value="steps" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Step Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Numbered step components for guide instructions with screenshot support.
                  </p>
                  
                  <div className="space-y-6">
                    <Step
                      step={1}
                      title="Sign In to Your Account"
                      description="Click the 'Sign In with Replit' button on the landing page to authenticate with your Replit account."
                      completed={true}
                    >
                      <Callout variant="tip">
                        Your account will be created automatically using secure OAuth authentication.
                      </Callout>
                    </Step>

                    <Step
                      step={2}
                      title="Add Your First Account"
                      description="Start by adding a bank account, credit card, or other financial account you want to track."
                    >
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Account types you can add:</p>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside ml-4">
                          <li>Checking and savings accounts</li>
                          <li>Credit cards</li>
                          <li>Investment accounts</li>
                          <li>Cash and business accounts</li>
                        </ul>
                      </div>
                    </Step>

                    <Step
                      step={3}
                      title="Record Your First Transaction"
                      description="Add income, expenses, or transfers to start building your financial picture."
                    >
                      <Callout variant="info">
                        The system will automatically calculate your daily balances and help you maintain accuracy.
                      </Callout>
                    </Step>

                    <Step
                      step={4}
                      title="Review Your Dashboard"
                      description="Check your dashboard to see account balances, recent activity, and financial insights."
                      imageCaption="Example of what your dashboard might look like after adding accounts and transactions"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ Demo */}
            <TabsContent value="faq" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>FAQ Accordion Component</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Accordion component for FAQ display with categories, types, and badges.
                  </p>
                  
                  <HelpAccordion 
                    items={faqItems}
                    showCategories={true}
                    allowMultiple={true}
                    defaultValue={["getting-started-basics"]}
                  />

                  <Callout variant="tip" title="Features" className="mt-6">
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Automatic categorization</li>
                      <li>Type-based badges and icons</li>
                      <li>Support for "New" and "Important" flags</li>
                      <li>Tag system for better organization</li>
                      <li>Multiple items can be open simultaneously</li>
                    </ul>
                  </Callout>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}