import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@income/components/ui/toaster";
import { TooltipProvider } from "@income/components/ui/tooltip";
import { useAuth } from "@income/hooks/use-auth";
import Landing from "@income/pages/landing";
import Home from "@income/pages/home";
import AboutPage from "@income/pages/about";
import FAQPage from "@income/pages/faq";
import Reflections from "@income/pages/reflections";
import IncomeHistoryPage from "@income/pages/income-history";
import SettingsPage from "@income/pages/settings";
import PrivacyPolicyPage from "@income/pages/privacy-policy";
import TermsOfUsePage from "@income/pages/terms-of-use";
import HowToUsePage from "@income/pages/how-to-use";
import AccountsPage from "@income/pages/accounts";
import NotFound from "@income/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600">Loading IncomeLift...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Switch>
      <Route path="/income/home" component={Home} />
      <Route path="/income" component={Home} />
      <Route path="/income/about" component={AboutPage} />
      <Route path="/income/settings" component={SettingsPage} />
      <Route path="/income/reflections" component={Reflections} />
      <Route path="/income/income-history" component={IncomeHistoryPage} />
      <Route path="/income/faq" component={FAQPage} />
      <Route path="/income/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/income/terms-of-use" component={TermsOfUsePage} />
      <Route path="/income/how-to-use" component={HowToUsePage} />
      <Route path="/income/accounts" component={AccountsPage} />
      <Route component={NotFound} />
    </Switch>
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


