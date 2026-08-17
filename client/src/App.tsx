import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@clerk/clerk-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import Home from "@/pages/home";
import Landing from "@/pages/Landing";
import Calendar from "@/pages/calendar";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import UnifiedPaymentMonitoring from "@/pages/unified-payment-monitoring";
import AdminTrigger from "@/pages/admin-trigger";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfUse from "@/pages/TermsOfUse";
import HowToUse from "@/pages/HowToUse";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";
import { Payment } from "@/pages/payment";
import PaymentSuccess from "@/pages/payment-success";
import { BillDetails } from "@/pages/bill-details";
import Accounts from "@/pages/accounts";
import SignInPage from "@/pages/SignInPage";
import NotFound from "@/pages/not-found";
import { MembershipGate } from "@/components/MembershipGate";

function ProtectedRoutes() {
  return (
    <MembershipGate>
      <Switch>
        <Route path="/app" component={Home} />
        <Route path="/bill/:id" component={BillDetails} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route
          path="/payment-monitoring"
          component={UnifiedPaymentMonitoring}
        />
        <Route path="/calendar" component={Calendar} />
        <Route path="/reports" component={Reports} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin-trigger" component={AdminTrigger} />
        <Route component={NotFound} />
      </Switch>
    </MembershipGate>
  );
}

function Router() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <Switch>
      {/* Public landing page — always stays public */}
      <Route path="/" component={Landing} />

      {/* Public routes */}
      <Route path="/payment" component={Payment} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-use" component={TermsOfUse} />
      <Route path="/how-to-use" component={HowToUse} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />

      {/* Everything below this point requires authentication */}
      <Route path="*">
        {() => {
          if (!isLoaded) {
            return (
              <div className="flex items-center justify-center min-h-screen">
                Loading...
              </div>
            );
          }

          if (!isSignedIn) {
            return <Landing />;
          }

          return <ProtectedRoutes />;
        }}
      </Route>
    </Switch>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[app:error-boundary]", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
          <div className="max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app hit an unexpected error. Please reload the page and try again.
            </p>
            <button
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;