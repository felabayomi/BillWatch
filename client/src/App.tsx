import PlatformNav from "@/platform/PlatformNav";
import ToolAccessGate from "@/platform/ToolAccessGate";
import { Switch, Route, Redirect } from "wouter";
import {
  queryClient,
  setAuthTokenProvider,
} from "./lib/queryClient";import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  Component,
  useEffect,
  type ErrorInfo,
  type ReactNode,
} from "react";
import PlatformHome from "@/platform/PlatformHome";
import { FinancialOSMembershipProvider } from "@/platform/MembershipContext";
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
import FinanceApp from "../../apps/finance/client/src/App";
import ExpenseApp from "../../apps/expense/client/src/App";
import IncomeApp from "../../apps/income/client/src/App";

function ClerkApiBridge() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    setAuthTokenProvider(async () => {
      return await getToken();
    });

    return () => {
      setAuthTokenProvider(async () => null);
    };
  }, [getToken, isLoaded]);

  return null;
}
function ProtectedRoutes() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PlatformNav />

      <Switch>
        {/* FinanceWatch */}
        <Route path="/finance/*">
          {() => (
            <ToolAccessGate tool="FinanceWatch">
              <FinanceApp />
            </ToolAccessGate>
          )}
        </Route>

        <Route path="/finance">
          {() => (
            <ToolAccessGate tool="FinanceWatch">
              <FinanceApp />
            </ToolAccessGate>
          )}
        </Route>

        {/* IncomeLift */}
          <Route path="/income/:rest*">
            {() => (
              <ToolAccessGate tool="IncomeLift">
                <IncomeApp />
              </ToolAccessGate>
            )}
          </Route>

          <Route path="/income">
            {() => (
              <ToolAccessGate tool="IncomeLift">
                <IncomeApp />
              </ToolAccessGate>
            )}
          </Route>

          {/* ExpenseWatch */}
        <Route path="/expense/:rest*">
          {() => (
            <ToolAccessGate tool="ExpenseWatch">
              <ExpenseApp />
            </ToolAccessGate>
          )}
        </Route>

        <Route path="/expense">
          {() => (
            <ToolAccessGate tool="ExpenseWatch">
              <ExpenseApp />
            </ToolAccessGate>
          )}
        </Route>

        {/* BillWatch */}
<Route path="/bills">
  {() => (
    <ToolAccessGate tool="BillWatch">
      <Home />
    </ToolAccessGate>
  )}
</Route>

<Route path="/bills/bill/:id">
  {(params) => (
    <ToolAccessGate tool="BillWatch">
      <BillDetails params={params} />
    </ToolAccessGate>
  )}
</Route>

<Route path="/bills/payment-success">
  {() => (
    <ToolAccessGate tool="BillWatch">
      <PaymentSuccess />
    </ToolAccessGate>
  )}
</Route>

<Route path="/bills/payment-monitoring">
  {() => (
    <ToolAccessGate tool="BillWatch">
      <UnifiedPaymentMonitoring />
    </ToolAccessGate>
  )}
</Route>

<Route path="/bills/calendar">
  {() => (
    <ToolAccessGate tool="BillWatch">
      <Calendar />
    </ToolAccessGate>
  )}
</Route>

<Route path="/bills/reports">
  {() => (
    <ToolAccessGate tool="BillWatch">
      <Reports />
    </ToolAccessGate>
  )}
</Route>

<Route path="/bills/accounts">
  {() => (
    <ToolAccessGate tool="BillWatch">
      <Accounts />
    </ToolAccessGate>
  )}
</Route>

<Route path="/bills/settings">
  {() => (
    <ToolAccessGate tool="BillWatch">
      <Settings />
    </ToolAccessGate>
  )}
</Route>

<Route path="/bills/admin-trigger">
  {() => (
    <ToolAccessGate tool="BillWatch">
      <AdminTrigger />
    </ToolAccessGate>
  )}
</Route>

        <Route component={NotFound} />
      </Switch>
    </div>
  );
}
function Router() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <Switch>
      {/* Public landing page â€” always stays public */}
<Route path="/">
  {() => (
    <div className="min-h-screen bg-slate-50">
      <PlatformNav />
      <PlatformHome />
    </div>
  )}
</Route>
<Route path="/app">
  <Redirect to="/bills" />
</Route>

<Route path="/calendar">
  <Redirect to="/bills/calendar" />
</Route>

<Route path="/reports">
  <Redirect to="/bills/reports" />
</Route>

<Route path="/accounts">
  <Redirect to="/bills/accounts" />
</Route>

<Route path="/settings">
  <Redirect to="/bills/settings" />
</Route>

<Route path="/payment-monitoring">
  <Redirect to="/bills/payment-monitoring" />
</Route>

<Route path="/payment-success">
  <Redirect to="/bills/payment-success" />
</Route>

<Route path="/admin-trigger">
  <Redirect to="/bills/admin-trigger" />
</Route>
      {/* Public routes */}
      <Route path="/payment" component={Payment} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-use" component={TermsOfUse} />
      <Route path="/how-to-use" component={HowToUse} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
<Route path="/bill/:id">
  {(params) => (
    <Redirect to={`/bills/bill/${params.id}`} />
  )}
</Route>

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
  return (
    <div className="min-h-screen bg-slate-50">
      <PlatformNav />
      <PlatformHome />
    </div>
  );
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
        <ClerkApiBridge />

        <FinancialOSMembershipProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </FinancialOSMembershipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
export default App;


