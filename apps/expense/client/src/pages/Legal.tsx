import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@expense/components/ui/button";
import { ArrowLeft, Receipt } from "lucide-react";

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/expense")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">ExpenseWatch</span>
        </div>
        <span className="text-muted-foreground text-sm">/ {title}</span>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-sm leading-relaxed text-foreground">
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function About() {
  return (
    <PageShell title="About ExpenseWatch">
      <p>
        ExpenseWatch is a smart, mobile-first expense tracking application built by <strong>Debt to Legacy LLC</strong> — a personal finance and debt management consulting business dedicated to helping individuals take control of their money, eliminate debt, and build lasting wealth.
      </p>
      <h2 className="text-lg font-semibold mt-6">What ExpenseWatch Does</h2>
      <p>
        ExpenseWatch combines AI-powered receipt scanning, automatic categorization, and cloud sync to make recording your daily spending effortless. Whether you photograph a physical receipt or screenshot your bank app, ExpenseWatch extracts the key details — merchant, amount, date, and category — and logs them automatically.
      </p>
      <h2 className="text-lg font-semibold mt-6">Part of the Felix Financial Suite</h2>
      <p>
        ExpenseWatch is one of several financial tools offered under the Felix Financial Suite, including FinanceWatch, BillWatch, IncomeLift, SteadyVest, and more. These tools work together to give you a complete picture of your financial life. Expenses logged in ExpenseWatch automatically sync to FinanceWatch for a full financial overview.
      </p>
      <h2 className="text-lg font-semibold mt-6">Who It's For</h2>
      <p>
        ExpenseWatch is designed for Felix Pay Control-tier members who want a dedicated, powerful tool for tracking day-to-day expenses — whether personal or business. It is especially useful for individuals building toward financial freedom who need an accurate picture of where their money goes.
      </p>
      <h2 className="text-lg font-semibold mt-6">Contact</h2>
      <p>
        For support or questions, please contact us through <a href="https://felixpay.net" className="text-primary underline" target="_blank" rel="noopener noreferrer">felixpay.net</a> or reach out to your Debt to Legacy consultant.
      </p>
    </PageShell>
  );
}

export function HowToUse() {
  return (
    <PageShell title="How to Use ExpenseWatch">
      <p>
        Getting started is simple. Here's how to make the most of ExpenseWatch:
      </p>

      <h2 className="text-lg font-semibold mt-6">1. Get Access</h2>
      <p>
        ExpenseWatch requires an active <strong>Felix Pay Control-tier membership</strong> ($24/month). Subscribe at <a href="https://felixpay.net/membership" className="text-primary underline" target="_blank" rel="noopener noreferrer">felixpay.net/membership</a>, then sign in using the SSO button on the landing page.
      </p>

      <h2 className="text-lg font-semibold mt-6">2. Set Up Your Accounts</h2>
      <p>
        Go to the <strong>Accounts</strong> tab and import your FinanceWatch accounts. This ensures every expense you log is automatically linked to the right bank account when it syncs over to FinanceWatch.
      </p>

      <h2 className="text-lg font-semibold mt-6">3. Scan Receipts</h2>
      <p>
        Tap <strong>Scan Receipt</strong> on the home screen. You can take a photo of a physical receipt or upload a screenshot from your bank app. The AI reads the image, extracts the merchant, amount, date, and category, and creates a draft for you to review. Approve it to log the expense.
      </p>

      <h2 className="text-lg font-semibold mt-6">4. Add Expenses Manually</h2>
      <p>
        Tap <strong>Add Expense</strong> to enter an expense by hand. Fill in the amount, description, category, date, and — importantly — the <strong>FinanceWatch Account</strong> field so the expense syncs to the right account.
      </p>

      <h2 className="text-lg font-semibold mt-6">5. View Your Spending</h2>
      <p>
        The home screen shows your monthly total and recent transactions. Use the <strong>Analytics</strong> tab to see a breakdown by category, compare months, and identify your biggest spending areas.
      </p>

      <h2 className="text-lg font-semibold mt-6">6. Sync to FinanceWatch</h2>
      <p>
        Every expense is automatically sent to FinanceWatch the moment it is saved — no action required. FinanceWatch will record it under the account you selected and categorize it accordingly.
      </p>

      <h2 className="text-lg font-semibold mt-6">7. Set a Budget</h2>
      <p>
        In <strong>Settings</strong>, you can set a monthly spending budget. The home screen will show your progress and alert you when you're approaching your limit.
      </p>
    </PageShell>
  );
}

export function Privacy() {
  return (
    <PageShell title="Privacy Policy">
      <p className="text-muted-foreground text-xs">Last updated: February 2026</p>
      <p>
        Debt to Legacy LLC ("we," "us," or "our") operates ExpenseWatch. This policy explains how we collect, use, and protect your information when you use the ExpenseWatch application.
      </p>

      <h2 className="text-lg font-semibold mt-6">Information We Collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Your name and email address, provided through Replit SSO authentication</li>
        <li>Expense records you create, including amounts, descriptions, dates, categories, and notes</li>
        <li>Receipt images you scan or upload</li>
        <li>Device and usage information collected automatically for app performance</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">How We Use Your Information</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>To provide and operate the ExpenseWatch service</li>
        <li>To sync your expenses to FinanceWatch for a unified financial view</li>
        <li>To verify your Felix Pay membership and access tier</li>
        <li>To process receipt images through AI (OpenAI GPT-4o) for data extraction</li>
        <li>To improve the accuracy and performance of the application</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">Data Storage</h2>
      <p>
        Your expense data is stored securely in a PostgreSQL database hosted on Neon. Receipt images are stored in private cloud storage accessible only to your account. Data is not shared with third parties except as described in this policy.
      </p>

      <h2 className="text-lg font-semibold mt-6">Third-Party Services</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Replit Auth</strong> — Handles secure sign-in via OpenID Connect</li>
        <li><strong>OpenAI</strong> — Receipt images and OCR text are sent to OpenAI GPT-4o for data extraction. OpenAI's privacy policy applies to this processing.</li>
        <li><strong>FinanceWatch</strong> — Expense data is synced to FinanceWatch as part of the Felix Financial Suite</li>
        <li><strong>Felix Pay</strong> — Membership verification is performed via the Felix Pay API</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">Your Rights</h2>
      <p>
        You may request deletion of your account and associated data at any time by contacting us through felixpay.net. You may also export your expense data from the Settings page.
      </p>

      <h2 className="text-lg font-semibold mt-6">Security</h2>
      <p>
        We use industry-standard security practices including HTTPS encryption, secure session management, and private cloud storage for receipt images. Access to your data requires authenticated sessions.
      </p>

      <h2 className="text-lg font-semibold mt-6">Contact</h2>
      <p>
        For privacy-related questions, contact us at <a href="https://felixpay.net" className="text-primary underline" target="_blank" rel="noopener noreferrer">felixpay.net</a>.
      </p>
    </PageShell>
  );
}

export function Terms() {
  return (
    <PageShell title="Terms of Use">
      <p className="text-muted-foreground text-xs">Last updated: February 2026</p>
      <p>
        By accessing or using ExpenseWatch, you agree to be bound by these Terms of Use. If you do not agree, please do not use the application.
      </p>

      <h2 className="text-lg font-semibold mt-6">Eligibility</h2>
      <p>
        ExpenseWatch is available exclusively to active Felix Pay Control-tier members. You must maintain a valid membership to access the service. Membership is managed through <a href="https://felixpay.net" className="text-primary underline" target="_blank" rel="noopener noreferrer">felixpay.net</a>.
      </p>

      <h2 className="text-lg font-semibold mt-6">Acceptable Use</h2>
      <p>You agree to use ExpenseWatch only for lawful personal or business expense tracking. You may not:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Use the service to record fraudulent or falsified transactions</li>
        <li>Attempt to access other users' data</li>
        <li>Reverse-engineer, scrape, or exploit the application</li>
        <li>Use the service in any way that violates applicable laws</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">Your Data</h2>
      <p>
        You retain ownership of the expense data you enter. By using the service, you grant Debt to Legacy LLC a limited license to process and store your data for the purpose of providing the service, including syncing to other tools in the Felix Financial Suite.
      </p>

      <h2 className="text-lg font-semibold mt-6">Service Availability</h2>
      <p>
        We strive for continuous availability but do not guarantee uninterrupted service. Scheduled maintenance, updates, or unforeseen issues may cause temporary downtime.
      </p>

      <h2 className="text-lg font-semibold mt-6">Limitation of Liability</h2>
      <p>
        ExpenseWatch is provided as a tool to assist with personal expense tracking. It is not a substitute for professional financial or tax advice. Debt to Legacy LLC is not liable for financial decisions made based on data within the application.
      </p>

      <h2 className="text-lg font-semibold mt-6">Changes to These Terms</h2>
      <p>
        We may update these terms from time to time. Continued use of ExpenseWatch after changes are posted constitutes acceptance of the updated terms.
      </p>

      <h2 className="text-lg font-semibold mt-6">Contact</h2>
      <p>
        For questions about these terms, contact us at <a href="https://felixpay.net" className="text-primary underline" target="_blank" rel="noopener noreferrer">felixpay.net</a>.
      </p>
    </PageShell>
  );
}

export function DataUsage() {
  return (
    <PageShell title="Data Usage">
      <p className="text-muted-foreground text-xs">Last updated: February 2026</p>
      <p>
        This page explains specifically what data ExpenseWatch collects, how it flows through the system, and where it is stored.
      </p>

      <h2 className="text-lg font-semibold mt-6">Expense Records</h2>
      <p>
        Every expense you log is stored in a secure PostgreSQL database tied to your account. This includes the amount, description, category, date, payment method, notes, and any FinanceWatch account or category mappings you set.
      </p>

      <h2 className="text-lg font-semibold mt-6">Receipt Images</h2>
      <p>
        When you scan a receipt or upload an image, it is:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Sent to <strong>OpenAI GPT-4o Vision</strong> for text and data extraction. OpenAI processes the image according to their data use policies. Images sent via API are not used to train OpenAI models by default.</li>
        <li>Stored in <strong>private cloud storage</strong> (Google Cloud Storage via Replit Object Storage) under your account. These images are not publicly accessible.</li>
        <li>Linked to the expense record in the database by a secure reference URL</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">FinanceWatch Sync</h2>
      <p>
        When an expense is saved, the following fields are sent to FinanceWatch via an encrypted API call:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Amount, description, date, category, account name</li>
        <li>Business expense flag and business name (if applicable)</li>
        <li>A unique source ID for deduplication</li>
        <li>Source identifier ("ExpenseWatch")</li>
      </ul>
      <p>
        Receipt images are not sent to FinanceWatch.
      </p>

      <h2 className="text-lg font-semibold mt-6">Membership Verification</h2>
      <p>
        Your email address is sent to the Felix Pay API to verify your membership tier each time you access the app. This check is cached for 5 minutes to avoid excessive API calls. No payment information passes through ExpenseWatch.
      </p>

      <h2 className="text-lg font-semibold mt-6">Authentication Data</h2>
      <p>
        Sign-in is handled entirely by Replit Auth using OpenID Connect. ExpenseWatch stores only your name, email, and profile image URL returned by the auth provider — no passwords are stored.
      </p>

      <h2 className="text-lg font-semibold mt-6">Data Retention</h2>
      <p>
        Your data is retained for as long as you maintain an active account. Deleted expenses are soft-deleted and fully purged on request. You may request full account deletion by contacting us through <a href="https://felixpay.net" className="text-primary underline" target="_blank" rel="noopener noreferrer">felixpay.net</a>.
      </p>
    </PageShell>
  );
}
