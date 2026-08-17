import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

import { Sidebar } from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import Transfers from "@/pages/transfers";
import Categories from "@/pages/categories";
import Businesses from "@/pages/businesses";
import CashFlow from "@/pages/cash-flow";
import BalanceSheet from "@/pages/balance-sheet";
import Reports from "@/pages/reports";
import Landing from "@/pages/landing";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfUse from "@/pages/terms-of-use";
import About from "@/pages/about";
import FAQ from "@/pages/faq";
import HowToUse from "@/pages/how-to-use";
import Help from "@/pages/help";
import HelpContent from "@/pages/help-content";
import AccountLedger from "@/pages/account-ledger";
import BalanceCorrection from "@/pages/balance-correction";
import NotFound from "@/pages/not-found";
import AccountantView from "@/pages/accountant-view";
import DataUsage from "@/pages/data-usage";
import { MembershipGate } from "@/components/MembershipGate";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Public routes — accessible without any login
  if (window.location.pathname.startsWith("/accountant/")) {
    return (
      <>
        <ScrollToTop />
        <Switch>
          <Route path="/accountant/:token" component={AccountantView} />
        </Switch>
      </>
    );
  }

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading FinanceWatch...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
      <ScrollToTop />
      <Switch>
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-use" component={TermsOfUse} />
        <Route path="/about" component={About} />
        <Route path="/help/:category/:slug" component={HelpContent} />
        <Route path="/help/:slug" component={Help} />
        <Route path="/help" component={Help} />
        <Route path="/businesses" component={Businesses} />
        <Route path="/faq" component={FAQ} />
        <Route path="/how-to-use" component={HowToUse} />
        <Route path="/data-usage" component={DataUsage} />
        <Route path="/" component={Landing} />
        <Route>
          <Landing />
        </Route>
      </Switch>
      </>
    );
  }

  // Show authenticated app with sidebar - membership gate checks subscription
  return (
    <MembershipGate>
      <ScrollToTop />
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto md:ml-0">
          {/* Mobile top padding for header */}
          <div className="md:hidden h-20"></div>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/accounts/:id/ledger" component={AccountLedger} />
            <Route path="/correct-balances" component={BalanceCorrection} />
            <Route path="/accounts" component={Accounts} />
            <Route path="/transfers" component={Transfers} />
            <Route path="/categories" component={Categories} />
            <Route path="/businesses" component={Businesses} />
            <Route path="/cash-flow" component={CashFlow} />
            <Route path="/balance-sheet" component={BalanceSheet} />
            <Route path="/reports" component={Reports} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/terms-of-use" component={TermsOfUse} />
            <Route path="/about" component={About} />
            <Route path="/help/:category/:slug" component={HelpContent} />
            <Route path="/help/:slug" component={Help} />
            <Route path="/help" component={Help} />
            <Route path="/faq" component={FAQ} />
            <Route path="/how-to-use" component={HowToUse} />
            <Route path="/data-usage" component={DataUsage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </MembershipGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
