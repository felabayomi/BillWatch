import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { Badge } from "@finance/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@finance/components/ui/dialog";
import { Shield, RefreshCw, Lock, TrendingUp, Calculator, PieChart, Smartphone, Star, Receipt, Menu, X, Mail, FileCheck, PiggyBank, BarChart3, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

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

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [frameworkOpen, setFrameworkOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      {/* Navigation */}
      <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900 dark:text-white leading-tight">FinanceWatch</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">by Debt to Legacy LLC</span>
              </div>
            </div>
            
            
            {/* Header Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <a href="https://felixpay.net/membership">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold"
                  data-testid="button-header-membership"
                >
                  Get Membership
                </Button>
              </a>
              <Button 
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 px-4 py-2 text-sm font-semibold"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-header-login"
              >
                Sign In
              </Button>
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800 transition-colors"
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          
          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="px-4 py-4 space-y-2">
                <a href="https://felixpay.net/membership" className="block">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold"
                    data-testid="button-mobile-membership"
                  >
                    Get Started with Membership
                  </Button>
                </a>
                <Button 
                  variant="outline"
                  className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 py-3 font-semibold"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-mobile-login"
                >
                  Sign In with SSO
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <Star className="h-4 w-4 mr-2" />
            Sign in to FinanceWatch-MoneyTracker
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            FinanceWatch-MoneyTracker
            <br />
            <span className="text-blue-600 dark:text-blue-400">by Debt to Legacy LLC</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Comprehensive DIY finance tracking across all your accounts and assets for visualizations of cash flow and portfolio performance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <a href="https://felixpay.net/membership">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
                data-testid="button-membership"
              >
                Get Started with Membership
              </Button>
            </a>
            <Button 
              size="lg" 
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 px-8 py-3 text-lg font-semibold"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Sign In with SSO
            </Button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            New here? Get a membership first. Already a member? Sign in to access your account.
          </p>
          <a href="https://debtlegacypath.com" target="_blank" rel="noopener noreferrer">
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold mb-12"
              data-testid="button-roadmap-test"
            >
              Take Financial Roadmap Test
            </Button>
          </a>

          {/* Security Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bank-level Security</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
                Enterprise-grade security protocols protect your financial data
              </p>
            </div>
            
            <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">End-to-end Encrypted</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
                Your financial information is encrypted at every step
              </p>
            </div>
            
            <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <RefreshCw className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Real-time Sync</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
                Access your data instantly across all your devices
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white dark:bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
              Complete Financial Account Management
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-2">
                    <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg">Manual Precision</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    Complete financial management with manual entry and daily balancing across all your accounts - checking, savings, credit cards, cash, and investments
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-lg">Daily Summaries</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    Mathematical balance verification with detailed daily financial summaries
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-2">
                    <PieChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-lg">Multi-Account Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    Track multiple account types including checking, savings, credit cards, cash, investments, and business accounts with proper accounting principles
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-2">
                    <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-lg">Mobile Ready</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    Full-featured Progressive Web App with offline capabilities for complete financial management on any device
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Company Branding Section */}
      <section className="space-y-8 bg-gray-50 dark:bg-gray-900 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-6">
            <h3 className="text-3xl font-bold text-foreground">About Debt to Legacy LLC</h3>
            <div className="max-w-4xl mx-auto space-y-4">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Debt to Legacy LLC is a personal finance and wealth-building company designed to help individuals 
                move from financial stress to long-term stability and legacy creation.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Through DTL Navigation Tools, our suite of connected financial applications, clients gain clear 
                visibility and control over every aspect of their financial lives — from income and spending to 
                debt elimination, saving, investing, and wealth tracking.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
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
              <p className="text-lg font-semibold text-foreground leading-relaxed text-center">
                Income → Spend → Track → Eliminate Debt → Save → Invest → Build Wealth → Create Legacy
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We don't believe in quick fixes or fragmented advice. We believe in systems, clarity, and 
                consistency — one system, guiding every money decision, for a lifetime.
              </p>
            </div>
          </div>
        </div>
      </section>

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
 
      {/* Product Navigation Suite */}
      <section className="space-y-8 bg-white dark:bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4">
            <h3 className="text-3xl font-bold text-foreground">Complete Financial Suite</h3>
            <p className="text-lg text-muted-foreground">
              Explore our comprehensive range of financial tools and services
            </p>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>IncomeLift</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Boost your income streams</p>
                <a 
                  href="https://incomelift.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-incomelift"
                >
                  Visit IncomeLift →
                </a>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>SteadyVest</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Steady growth investing</p>
                <a 
                  href="https://steadyvest.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-steadyvest"
                >
                  Visit SteadyVest →
                </a>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Receipt className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>BillWatch</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Smart bill management</p>
                <a 
                  href="https://billwatch.pro/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-billwatch"
                >
                  Visit BillWatch →
                </a>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>DIY Debt</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Debt elimination strategies</p>
                <a 
                  href="https://diydebt.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-diydebt"
                >
                  Visit DIY Debt →
                </a>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Felix Pay</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Secure payment solutions</p>
                <a 
                  href="https://felixpay.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-felixpay"
                >
                  Visit Felix Pay →
                </a>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Calculator className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>ExpenseWatch</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Advanced expense tracking</p>
                <a 
                  href="https://expensewatch.pro/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-expensewatch"
                >
                  Visit ExpenseWatch →
                </a>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-2 border-primary">
              <CardHeader className="text-center">
                <PieChart className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>FinanceWatch</CardTitle>
                <Badge className="bg-primary/10 text-primary">Current App</Badge>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Complete financial overview</p>
                <span className="text-primary font-medium">You're here! →</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <FileCheck className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Felix CheckBook</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Check printing & mailing service</p>
                <a 
                  href="https://felixcheck.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-felixcheckbook"
                >
                  Visit Felix CheckBook →
                </a>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <PiggyBank className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>SavingsPro</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Smart savings strategies</p>
                <a 
                  href="https://savingspro.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-savingspro"
                >
                  Visit SavingsPro →
                </a>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>WealthWatch</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">Track Your Cash Flow, Build Your Wealth</p>
                <a 
                  href="https://wealth-watch.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-wealthwatch"
                >
                  Visit WealthWatch →
                </a>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
              <a href="https://felixpay.net/membership">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
                  data-testid="button-get-started"
                >
                  Get Started with Membership
                </Button>
              </a>
              <Button 
                size="lg" 
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 px-8 py-3 text-lg font-semibold"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-bottom-login"
              >
                Sign In with SSO
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Start tracking your finances professionally today
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/95 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center space-y-5">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground transition-colors" data-testid="link-about">
                About FinanceWatch
              </Link>
              <Link href="/how-to-use" className="hover:text-foreground transition-colors" data-testid="link-how-to-use">
                How to Use
              </Link>
              <Link href="/privacy-policy" className="hover:text-foreground transition-colors" data-testid="link-privacy">
                Privacy Policy
              </Link>
              <Link href="/terms-of-use" className="hover:text-foreground transition-colors" data-testid="link-terms">
                Terms of Use
              </Link>
              <Link href="/data-usage" className="hover:text-foreground transition-colors" data-testid="link-data-usage">
                Data Usage
              </Link>
              <a href="https://debttolegacy.com/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" data-testid="link-contact">
                Contact
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Debt to Legacy LLC. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
