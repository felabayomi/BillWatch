import {
  Switch,
  Route,
  useLocation,
} from "wouter";

import { useEffect } from "react";

import {
  QueryClientProvider,
} from "@tanstack/react-query";

import { queryClient } from "./lib/queryClient";

import { Toaster } from "@finance/components/ui/toaster";
import { TooltipProvider } from "@finance/components/ui/tooltip";

import { useAuth } from "@finance/hooks/useAuth";

import { Sidebar } from "@finance/components/sidebar";

import Dashboard from "@finance/pages/dashboard";
import Accounts from "@finance/pages/accounts";
import Transfers from "@finance/pages/transfers";
import Categories from "@finance/pages/categories";
import Businesses from "@finance/pages/businesses";
import CashFlow from "@finance/pages/cash-flow";
import BalanceSheet from "@finance/pages/balance-sheet";
import Reports from "@finance/pages/reports";

import Landing from "@finance/pages/landing";
import PrivacyPolicy from "@finance/pages/privacy-policy";
import TermsOfUse from "@finance/pages/terms-of-use";
import About from "@finance/pages/about";
import FAQ from "@finance/pages/faq";
import HowToUse from "@finance/pages/how-to-use";
import Help from "@finance/pages/help";
import HelpContent from "@finance/pages/help-content";
import AccountLedger from "@finance/pages/account-ledger";
import BalanceCorrection from "@finance/pages/balance-correction";
import NotFound from "@finance/pages/not-found";
import AccountantView from "@finance/pages/accountant-view";
import DataUsage from "@finance/pages/data-usage";

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function PublicRoutes() {
  return (
    <>
      <ScrollToTop />

      <Switch>
        <Route
          path="/accountant/:token"
          component={AccountantView}
        />

        <Route
          path="/finance/privacy-policy"
          component={PrivacyPolicy}
        />

        <Route
          path="/finance/terms-of-use"
          component={TermsOfUse}
        />

        <Route
          path="/finance/about"
          component={About}
        />

        <Route
          path="/finance/help/:category/:slug"
          component={HelpContent}
        />

        <Route
          path="/finance/help/:slug"
          component={Help}
        />

        <Route
          path="/finance/help"
          component={Help}
        />

        <Route
          path="/finance/faq"
          component={FAQ}
        />

        <Route
          path="/finance/how-to-use"
          component={HowToUse}
        />

        <Route
          path="/finance/data-usage"
          component={DataUsage}
        />

        <Route
          path="/finance"
          component={Landing}
        />

        <Route>
          <Landing />
        </Route>
      </Switch>
    </>
  );
}

function AuthenticatedFinanceApp() {
  return (
    <>
      <ScrollToTop />

      <div className="flex min-h-[calc(100vh-3.5rem)] w-full bg-background">
        <Sidebar />

<main className="min-w-0 flex-1 overflow-x-hidden pt-14 lg:pt-0">
          <Switch>
            <Route
              path="/finance"
              component={Dashboard}
            />

            <Route
              path="/finance/accounts/:id/ledger"
              component={AccountLedger}
            />

            <Route
              path="/finance/correct-balances"
              component={BalanceCorrection}
            />

            <Route
              path="/finance/accounts"
              component={Accounts}
            />

            <Route
              path="/finance/transfers"
              component={Transfers}
            />

            <Route
              path="/finance/categories"
              component={Categories}
            />

            <Route
              path="/finance/businesses"
              component={Businesses}
            />

            <Route
              path="/finance/cash-flow"
              component={CashFlow}
            />

            <Route
              path="/finance/balance-sheet"
              component={BalanceSheet}
            />

            <Route
              path="/finance/reports"
              component={Reports}
            />

            <Route
              path="/finance/privacy-policy"
              component={PrivacyPolicy}
            />

            <Route
              path="/finance/terms-of-use"
              component={TermsOfUse}
            />

            <Route
              path="/finance/about"
              component={About}
            />

            <Route
              path="/finance/help/:category/:slug"
              component={HelpContent}
            />

            <Route
              path="/finance/help/:slug"
              component={Help}
            />

            <Route
              path="/finance/help"
              component={Help}
            />

            <Route
              path="/finance/faq"
              component={FAQ}
            />

            <Route
              path="/finance/how-to-use"
              component={HowToUse}
            />

            <Route
              path="/finance/data-usage"
              component={DataUsage}
            />

            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </>
  );
}

function Router() {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  if (
    window.location.pathname.startsWith(
      "/accountant/",
    )
  ) {
    return <PublicRoutes />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />

          <p className="text-muted-foreground">
            Loading FinanceWatch...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PublicRoutes />;
  }

  return <AuthenticatedFinanceApp />;
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
