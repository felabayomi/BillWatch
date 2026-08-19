import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@expense/components/ui/toaster";
import { TooltipProvider } from "@expense/components/ui/tooltip";
import { useAuth } from "@expense/hooks/useAuth";
import { MembershipGate } from "@expense/components/MembershipGate";
import { BottomNav } from "@expense/components/BottomNav";
import NotFound from "@expense/pages/not-found";
import Landing from "@expense/pages/Landing";
import Expenses from "@expense/pages/Expenses";
import Analytics from "@expense/pages/Analytics";
import Scanner from "@expense/pages/Scanner";
import Settings from "@expense/pages/Settings";
import Accounts from "@expense/pages/Accounts";
import { About, HowToUse, Privacy, Terms, DataUsage } from "@expense/pages/Legal";

function UnauthenticatedRouter() {
  return (
    <Switch>
      <Route path="/expense" component={Landing} />
      <Route path="/expense/about" component={About} />
      <Route path="/expense/how-to-use" component={HowToUse} />
      <Route path="/expense/privacy" component={Privacy} />
      <Route path="/expense/terms" component={Terms} />
      <Route path="/expense/data-usage" component={DataUsage} />
      <Route path="/expense/analytics" component={Landing} />
      <Route path="/expense/scanner" component={Landing} />
      <Route path="/expense/settings" component={Landing} />
      <Route path="/expense/accounts" component={Landing} />
      <Route component={Landing} />
    </Switch>
  );
}

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/expense" component={Expenses} />
      <Route path="/expense/about" component={About} />
      <Route path="/expense/how-to-use" component={HowToUse} />
      <Route path="/expense/privacy" component={Privacy} />
      <Route path="/expense/terms" component={Terms} />
      <Route path="/expense/data-usage" component={DataUsage} />
      <Route path="/expense/analytics" component={Analytics} />
      <Route path="/expense/scanner" component={Scanner} />
      <Route path="/expense/settings" component={Settings} />
      <Route path="/expense/accounts" component={Accounts} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return <UnauthenticatedRouter />;
  }
  return <AuthenticatedRouter />;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isLoading && isAuthenticated ? (
        <MembershipGate>
          <Router />
          <BottomNav />
        </MembershipGate>
      ) : (
        <Router />
      )}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
