import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Receipt, Smartphone, Eye, Users, Camera, Calendar, Shield, Lock, CheckCircle, TrendingUp, PiggyBank, CreditCard, Target, Wallet, DollarSign, Building2, FileCheck, Coins, BarChart3, ExternalLink, LogIn } from "lucide-react";
import heroMockup from "@assets/generated_images/Sharp_bill_management_app_mockup_7e6b0a72.png";
import step1Image from "@assets/generated_images/Scanning_bill_step_eeccd80b.png";
import step2Image from "@assets/generated_images/AI_extracting_data_450568c3.png";
import step3Image from "@assets/generated_images/Payment_reminder_notification_05b7afaa.png";
import { useClerk } from "@clerk/clerk-react";

const MEMBERSHIP_PORTAL_URL = import.meta.env.VITE_MEMBERSHIP_PORTAL_URL || "https://felixpay.net/membership";
const MEMBERSHIP_HUB_URL = import.meta.env.VITE_MEMBERSHIP_HUB_URL || new URL(MEMBERSHIP_PORTAL_URL).origin;

export default function Landing() {
  const { openSignIn } = useClerk();
  const handleLogin = () => {
    openSignIn({ redirectUrl: "/" });
  };

  const handleMembership = () => {
    window.open(MEMBERSHIP_PORTAL_URL, "_blank", "noopener,noreferrer");
  };

  const handleBillWatchClick = () => {
    window.open("https://billwatch.pro", "_blank", "noopener,noreferrer");
  };

  return (
    <Layout>
      {/* Hero Section */}
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div 
              onClick={handleBillWatchClick}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              data-testid="link-billwatch-branding"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBillWatchClick();
                }
              }}
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Receipt className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">BillWatch</h1>
                <p className="text-xs text-muted-foreground">
                  Smart Bill Management
                </p>
              </div>
            </div>
            <Button onClick={handleLogin} data-testid="button-login" className="gap-2">
              <LogIn className="h-4 w-4" />
              Sign in with SSO
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center px-6 py-16">
          <div className="max-w-md mx-auto text-center space-y-12">
            {/* Hero Visual */}
            <div className="relative">
              <img 
                src={heroMockup} 
                alt="BillWatch app mockup showing bill management interface"
                className="w-48 h-64 mx-auto object-contain"
                data-testid="hero-mockup"
                loading="eager"
                decoding="async"
              />
            </div>

            {/* Logo and Title */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-4xl font-extrabold text-foreground leading-[1.1] tracking-tight">
                  Be on Top of Your Bills
                </h2>
                <p className="text-sm text-muted-foreground font-medium">
                  by Debt to Legacy LLC
                </p>
                <p className="text-muted-foreground text-xl font-medium">
                  Track, scan, and pay smarter — NEVER miss a payment.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="pt-2 space-y-3">
                <Button 
                  size="lg" 
                  className="w-full max-w-xs mx-auto text-lg font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 gap-2" 
                  onClick={handleMembership}
                  data-testid="button-hero-cta"
                >
                  Get Started with Membership
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full max-w-xs mx-auto text-lg font-semibold py-6 gap-2" 
                  onClick={handleLogin}
                  data-testid="button-hero-sso"
                >
                  <LogIn className="h-5 w-5" />
                  Sign in with SSO
                </Button>
                <div className="flex justify-center pt-1">
                  <a
                    href="https://debtlegacypath.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-semibold shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all hover:shadow-xl"
                  >
                    Take Financial Roadmap Test
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Core Features */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 max-w-sm mx-auto">
                <div className="p-6 bg-card border border-border rounded-2xl text-center shadow-lg hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-3 text-lg">Scan & Extract</h3>
                  <p className="text-muted-foreground font-medium">
                    Snap a photo, let AI do the rest.
                  </p>
                </div>
                
                <div className="p-6 bg-card border border-border rounded-2xl text-center shadow-lg hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-7 w-7" style={{color: 'hsl(142, 71%, 45%)'}} />
                  </div>
                  <h3 className="font-bold text-foreground mb-3 text-lg">Smart Tracking</h3>
                  <p className="text-muted-foreground font-medium">
                    Color-coded calendar & reminders.
                  </p>
                </div>

                <div className="p-6 bg-card border border-border rounded-2xl text-center shadow-lg hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-7 w-7 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-foreground mb-3 text-lg">Secure & Private</h3>
                  <p className="text-muted-foreground font-medium">
                    Bank-level encryption for peace of mind.
                  </p>
                </div>
              </div>
              
            </div>

            {/* How It Works */}
            <div className="pt-16 space-y-10">
              <h3 className="text-3xl font-extrabold text-foreground text-center tracking-tight">How It Works</h3>
              
              <div className="space-y-10">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-3 shadow-lg">
                    <img 
                      src={step1Image} 
                      alt="Step 1: Scan bill"
                      className="w-20 h-20 object-contain"
                      data-testid="step-1-image"
                    />
                  </div>
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md">1</div>
                  <h4 className="font-bold text-foreground text-xl">Upload/Scan a Bill</h4>
                  <p className="text-muted-foreground max-w-sm font-medium">
                    Take a photo of your bill or upload an existing image
                  </p>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-3 shadow-lg">
                    <img 
                      src={step2Image} 
                      alt="Step 2: AI extracts data"
                      className="w-20 h-20 object-contain"
                      data-testid="step-2-image"
                    />
                  </div>
                  <div className="w-8 h-8 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md" style={{backgroundColor: 'hsl(142, 71%, 45%)'}}>2</div>
                  <h4 className="font-bold text-foreground text-xl">AI Extracts Details & Tracks Due Date</h4>
                  <p className="text-muted-foreground max-w-sm font-medium">
                    Our AI automatically reads and organizes all your bill information
                  </p>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mb-3 shadow-lg">
                    <img 
                      src={step3Image} 
                      alt="Step 3: Get reminders"
                      className="w-20 h-20 object-contain"
                      data-testid="step-3-image"
                    />
                  </div>
                  <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md">3</div>
                  <h4 className="font-bold text-foreground text-xl">Get Reminders & Pay On Time</h4>
                  <p className="text-muted-foreground max-w-sm font-medium">
                    Receive smart notifications so you never miss a payment
                  </p>
                </div>
              </div>
              
              {/* CTA after How It Works */}
              <div className="pt-6 space-y-3">
                <Button 
                  size="lg" 
                  className="w-full max-w-xs mx-auto text-lg font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 gap-2" 
                  onClick={handleMembership}
                  data-testid="button-how-it-works-cta"
                >
                  Get Started with Membership
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full max-w-xs mx-auto text-lg font-semibold py-6 gap-2" 
                  onClick={handleLogin}
                  data-testid="button-how-it-works-sso"
                >
                  <LogIn className="h-5 w-5" />
                  Sign in with SSO
                </Button>
              </div>
            </div>

            {/* Trust Section */}
            <div className="pt-16 space-y-8 border-t border-border">
              <h3 className="text-2xl font-extrabold text-foreground text-center tracking-tight">Trusted & Secure</h3>
              
              {/* Security Badges */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Bank-level Security</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                
                <div className="flex items-center justify-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Lock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Private & Encrypted</span>
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
              </div>

              {/* Technology Partners */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground text-center">Powered by trusted technology</p>
                <div className="flex items-center justify-center space-x-6 opacity-60">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">R</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">OpenID Connect</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">AI</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">OpenAI</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">DB</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">PostgreSQL</span>
                  </div>
                </div>
              </div>

              {/* Trust Statement */}
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-sm text-muted-foreground italic">
                  "Your financial data is encrypted end-to-end and never shared. 
                  We use the same security standards as major banks to keep your information safe."
                </p>
              </div>
            </div>

            {/* Final CTA */}
            <div className="pt-16 text-center space-y-6 border-t border-border">
              <h3 className="text-3xl font-extrabold text-foreground tracking-tight">
                Take control of your bills today.
              </h3>
              
              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full max-w-sm mx-auto text-xl font-bold py-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 gap-2" 
                  onClick={handleMembership}
                  data-testid="button-final-cta"
                >
                  Get Started with Membership
                  <ExternalLink className="h-5 w-5" />
                </Button>
                
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full max-w-sm mx-auto text-lg font-semibold py-6 gap-2" 
                  onClick={handleLogin}
                  data-testid="button-final-sso"
                >
                  <LogIn className="h-5 w-5" />
                  Sign in with SSO
                </Button>
              </div>
              
              <p className="text-lg text-muted-foreground font-medium">
                Membership required to access BillWatch
              </p>
            </div>

            {/* Company Branding Section */}
            <div className="pt-16 border-t border-border space-y-8">
              <div className="text-center space-y-6">
                <h3 className="text-3xl font-bold text-foreground">About Debt to Legacy LLC</h3>
                <div className="max-w-4xl mx-auto">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Debt to Legacy is a personal finance and debt management consulting business that equips 
                    individuals with practical tools to regain control of their money, eliminate debt, and build 
                    lasting wealth. Through comprehensive solutions, we guide clients step by step from financial 
                    struggle to financial freedom and legacy building.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Navigation Suite */}
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h3 className="text-3xl font-bold text-foreground">Complete Financial Suite</h3>
                <p className="text-lg text-muted-foreground">
                  Explore our comprehensive range of financial tools and services
                </p>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {/* IncomeLift */}
                <a 
                  href="https://incomelift.co/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-green-300 transition-all text-center min-h-[120px]"
                  data-testid="link-incomelift"
                >
                  <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                  <div className="font-semibold text-foreground text-sm">IncomeLift</div>
                  <div className="text-xs text-muted-foreground mt-1">Boost your income streams</div>
                </a>

                {/* SteadyVest */}
                <a 
                  href="https://steadyvest.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-blue-300 transition-all text-center min-h-[120px]"
                  data-testid="link-steadyvest"
                >
                  <PiggyBank className="h-8 w-8 text-blue-600 mb-2" />
                  <div className="font-semibold text-foreground text-sm">SteadyVest</div>
                  <div className="text-xs text-muted-foreground mt-1">Steady growth investing</div>
                </a>

                {/* BillWatch (Current App - You're Here) */}
                <div className="flex flex-col items-center justify-center p-4 bg-primary/10 border-2 border-primary rounded-xl text-center min-h-[120px] relative">
                  <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-medium">You're Here</div>
                  <CreditCard className="h-8 w-8 text-primary mb-2" />
                  <div className="font-semibold text-primary text-sm">BillWatch</div>
                  <div className="text-xs text-primary/80 mt-1">Smart bill management</div>
                </div>

                {/* DIY Debt */}
                <a 
                  href="https://diydebt.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-red-300 transition-all text-center min-h-[120px]"
                  data-testid="link-diy-debt"
                >
                  <Target className="h-8 w-8 text-red-600 mb-2" />
                  <div className="font-semibold text-foreground text-sm">DIY Debt</div>
                  <div className="text-xs text-muted-foreground mt-1">Debt elimination strategies</div>
                </a>

                {/* Felix Pay */}
                <a 
                  href={MEMBERSHIP_HUB_URL}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-purple-300 transition-all text-center min-h-[120px]"
                  data-testid="link-felix-pay"
                >
                  <Wallet className="h-8 w-8 text-purple-600 mb-2" />
                  <div className="font-semibold text-foreground text-sm">Felix Pay</div>
                  <div className="text-xs text-muted-foreground mt-1">Secure payment solutions</div>
                </a>

                {/* ExpenseWatch */}
                <a 
                  href="https://expensewatch.pro/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-yellow-300 transition-all text-center min-h-[120px]"
                  data-testid="link-expense-watch"
                >
                  <DollarSign className="h-8 w-8 text-yellow-600 mb-2" />
                  <div className="font-semibold text-foreground text-sm">ExpenseWatch</div>
                  <div className="text-xs text-muted-foreground mt-1">Advanced expense tracking</div>
                </a>

                {/* FinanceWatch */}
                <a 
                  href="https://financewatch.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-indigo-300 transition-all text-center min-h-[120px]"
                  data-testid="link-finance-watch"
                >
                  <Building2 className="h-8 w-8 text-indigo-600 mb-2" />
                  <div className="font-semibold text-foreground text-sm">FinanceWatch</div>
                  <div className="text-xs text-muted-foreground mt-1">Complete financial overview</div>
                </a>

                {/* Felix CheckBook */}
                <a 
                  href="https://felixcheck.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-teal-300 transition-all text-center min-h-[120px]"
                  data-testid="link-felix-checkbook"
                >
                  <FileCheck className="h-8 w-8 text-teal-600 mb-2" />
                  <div className="font-semibold text-foreground text-sm">Felix CheckBook</div>
                  <div className="text-xs text-muted-foreground mt-1">Check printing & mailing service</div>
                </a>

                {/* SavingsPro */}
                <a 
                  href="https://savingspro.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-emerald-300 transition-all text-center min-h-[120px]"
                  data-testid="link-savings-pro"
                >
                  <Coins className="h-8 w-8 text-emerald-600 mb-2" />
                  <div className="font-semibold text-foreground text-sm">SavingsPro</div>
                  <div className="text-xs text-muted-foreground mt-1">Smart savings strategies</div>
                </a>

                {/* WealthWatch */}
                <a 
                  href="https://wealth-watch.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-amber-300 transition-all text-center min-h-[120px]"
                  data-testid="link-wealth-watch"
                >
                  <BarChart3 className="h-8 w-8 text-amber-600 mb-2" />
                  <div className="font-semibold text-foreground text-sm">WealthWatch</div>
                  <div className="text-xs text-muted-foreground mt-1">Track cash flow, build wealth</div>
                </a>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="pt-12 border-t border-border space-y-8">
              <div className="text-center space-y-4">
                <h4 className="text-lg font-semibold text-foreground">Quick Links</h4>
                <div className="grid grid-cols-3 gap-3">
                  <a 
                    href="/about"
                    className="p-3 bg-card border border-border rounded-xl hover:shadow-md transition-shadow text-center"
                    data-testid="link-about"
                  >
                    <div className="font-medium text-foreground text-sm">About</div>
                    <div className="text-xs text-muted-foreground">Learn more</div>
                  </a>
                  
                  <a 
                    href="/contact"
                    className="p-3 bg-card border border-border rounded-xl hover:shadow-md transition-shadow text-center"
                    data-testid="link-contact"
                  >
                    <div className="font-medium text-foreground text-sm">Contact</div>
                    <div className="text-xs text-muted-foreground">Get help</div>
                  </a>
                  
                  <a 
                    href="/faq"
                    className="p-3 bg-card border border-border rounded-xl hover:shadow-md transition-shadow text-center"
                    data-testid="link-faq"
                  >
                    <div className="font-medium text-foreground text-sm">FAQ</div>
                    <div className="text-xs text-muted-foreground">Quick answers</div>
                  </a>
                </div>
                
                {/* Contact Info */}
                <div className="pt-4 border-t border-border space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Need help? Contact us at{" "}
                    <a 
                      href="mailto:felix@debttolegacy.com" 
                      className="text-primary hover:underline font-medium"
                      data-testid="link-contact-email"
                    >
                      felix@debttolegacy.com
                    </a>
                  </p>
                  <div className="text-center">
                    <a 
                      href="https://debttolegacy.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="link-contact-website"
                    >
                      Visit debttolegacy.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Signals */}
            <div className="pt-8 border-t border-border">
              <div className="flex justify-center items-center space-x-6 mb-6">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>Bank-Level Security</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>Data Encrypted</span>
                </div>
              </div>
              
              {/* Social Icons */}
              <div className="flex justify-center space-x-4 mb-6">
                <a 
                  href="https://facebook.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-muted/50 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                  data-testid="link-facebook"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-muted/50 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                  data-testid="link-instagram"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Copyright and Legal Links */}
            <div className="pt-6 text-center border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground">
                © 2025 Debt to Legacy LLC. All rights reserved.
              </p>
              <div className="flex justify-center items-center space-x-3 text-xs">
                <a 
                  href="/privacy-policy" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-privacy-policy"
                >
                  Privacy Policy
                </a>
                <span className="text-muted-foreground">|</span>
                <a 
                  href="/terms-of-use" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-terms-of-use"
                >
                  Terms of Use
                </a>
                <span className="text-muted-foreground">|</span>
                <a 
                  href="/how-to-use" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-how-to-use"
                >
                  How to Use
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
