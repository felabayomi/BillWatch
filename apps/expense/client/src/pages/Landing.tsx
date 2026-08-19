import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@expense/components/ui/button";
import { Card, CardContent } from "@expense/components/ui/card";
import { 
  Receipt, 
  Scan, 
  BarChart3, 
  Cloud,
  TrendingUp,
  Wallet,
  FileText,
  CreditCard,
  PiggyBank,
  Eye,
  Printer,
  DollarSign
} from "lucide-react";
import { useAuth } from "@expense/hooks/useAuth";
import { useToast } from "@expense/hooks/use-toast";

const financialSuite = [
  {
    name: "IncomeLift",
    description: "Boost your income streams",
    link: "https://incomelift.co/",
    icon: TrendingUp,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    name: "SteadyVest",
    description: "Steady growth investing",
    link: "https://steadyvest.org/",
    icon: BarChart3,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    name: "BillWatch",
    description: "Smart bill management",
    link: "https://billwatch.pro/",
    icon: FileText,
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    name: "DIY Debt",
    description: "Debt elimination strategies",
    link: "https://diydebt.org/",
    icon: CreditCard,
    bgColor: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    name: "Felix Pay",
    description: "Secure payment solutions",
    link: "https://felixpay.net/",
    icon: Wallet,
    bgColor: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    name: "ExpenseWatch",
    description: "Advanced expense tracking",
    link: "https://expensewatch.pro/",
    icon: Receipt,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
    current: true,
  },
  {
    name: "FinanceWatch",
    description: "Complete financial overview",
    link: "https://financewatch.app/",
    icon: Eye,
    bgColor: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  {
    name: "Felix CheckBook",
    description: "Check printing & mailing service",
    link: "https://felixcheck.com/",
    icon: Printer,
    bgColor: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  {
    name: "SavingsPro",
    description: "Smart savings strategies",
    link: "https://savingspro.app/",
    icon: PiggyBank,
    bgColor: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    name: "WealthWatch",
    description: "Track Your Cash Flow, Build Your Wealth",
    link: "https://wealth-watch.app/",
    icon: DollarSign,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
];

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Welcome to ExpenseWatch",
        description: "Please log in to start tracking your expenses",
      });
    }
  }, [isLoading, isAuthenticated, toast]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mx-auto mb-2" />
            <div className="h-4 bg-muted rounded w-24 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Receipt className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">ExpenseWatch</h1>
            <p className="text-muted-foreground mt-2">
              Smart expense tracking with AI-powered receipt scanning
            </p>
          </div>
          <div className="max-w-md mx-auto space-y-3 pt-2">
            <Button
              onClick={() => window.open("https://felixpay.net/membership", "_blank")}
              className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Get Started with Membership
            </Button>
            <Button
              onClick={handleLogin}
              className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-login"
            >
              Sign in with SSO
            </Button>
            <Button
              onClick={() => window.open("https://debtlegacypath.com", "_blank")}
              className="w-full h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white"
            >
              Take Financial Roadmap Test
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Subscribe at Felix Pay, then sign in to access ExpenseWatch
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Scan className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">OCR Scanning</h3>
                  <p className="text-xs text-muted-foreground">Auto-extract receipt data</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Analytics</h3>
                  <p className="text-xs text-muted-foreground">Spending insights</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Cloud Sync</h3>
                  <p className="text-xs text-muted-foreground">Access anywhere</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="border-t border-border pt-12">
          <div className="text-center space-y-4 mb-8">
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Debt to Legacy LLC</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Debt to Legacy is a personal finance and debt management consulting business that equips 
              individuals with practical tools to regain control of their money, eliminate debt, and build 
              lasting wealth. Through comprehensive solutions, we guide clients step by step from financial 
              struggle to financial freedom and legacy building.
            </p>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-foreground">Complete Financial Suite</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Explore our comprehensive range of financial tools and services
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialSuite.map((app) => {
              const Icon = app.icon;
              return (
                <a
                  key={app.name}
                  href={app.current ? "#" : app.link}
                  target={app.current ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className={`block transition-transform hover:scale-105 ${app.current ? 'cursor-default' : ''}`}
                  onClick={app.current ? (e) => e.preventDefault() : undefined}
                >
                  <Card className={`border-border/50 shadow-sm h-full ${app.current ? 'ring-2 ring-primary ring-offset-2' : 'hover:shadow-md'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${app.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                          <Icon className={`w-6 h-6 ${app.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm truncate">{app.name}</h3>
                            {app.current && (
                              <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full shrink-0">
                                You're Here
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{app.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>

        <div className="text-center pt-8 border-t border-border space-y-3">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
            <Link href="/expense/about" className="text-muted-foreground hover:text-primary transition-colors">About</Link>
            <Link href="/expense/how-to-use" className="text-muted-foreground hover:text-primary transition-colors">How to Use</Link>
            <Link href="/expense/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/expense/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Use</Link>
            <Link href="/expense/data-usage" className="text-muted-foreground hover:text-primary transition-colors">Data Usage</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ExpenseWatch by Debt to Legacy LLC. Building financial freedom, one step at a time.
          </p>
        </div>
      </div>
    </div>
  );
}
