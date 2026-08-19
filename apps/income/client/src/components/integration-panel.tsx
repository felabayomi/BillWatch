import { Card, CardContent } from "@income/components/ui/card";
import { Badge } from "@income/components/ui/badge";
import { 
  Eye, 
  ChartLine, 
  Shield, 
  Sprout, 
  CreditCard, 
  Receipt, 
  PieChart, 
  FileCheck, 
  PiggyBank,
  Wallet,
  ExternalLink
} from "lucide-react";

export default function IntegrationPanel() {
  const tools = [
    {
      name: "IncomeLift",
      description: "Boost your income streams",
      icon: ChartLine,
      bgColor: "bg-primary",
      link: "https://incomelift.co/",
      isCurrentApp: true
    },
    {
      name: "SteadyVest",
      description: "Steady growth investing",
      icon: Sprout,
      bgColor: "bg-purple-500",
      link: "https://steadyvest.org/",
      isCurrentApp: false
    },
    {
      name: "BillWatch",
      description: "Smart bill management",
      icon: Eye,
      bgColor: "bg-red-500",
      link: "https://billwatch.pro/",
      isCurrentApp: false
    },
    {
      name: "DIY Debt",
      description: "Debt elimination strategies",
      icon: Shield,
      bgColor: "bg-orange-500",
      link: "https://diydebt.org/",
      isCurrentApp: false
    },
    {
      name: "Felix Pay",
      description: "Secure payment solutions",
      icon: CreditCard,
      bgColor: "bg-blue-500",
      link: "https://felixpay.net/",
      isCurrentApp: false
    },
    {
      name: "ExpenseWatch",
      description: "Advanced expense tracking",
      icon: Receipt,
      bgColor: "bg-teal-500",
      link: "https://expensewatch.pro",
      isCurrentApp: false
    },
    {
      name: "FinanceWatch",
      description: "Complete financial overview",
      icon: PieChart,
      bgColor: "bg-indigo-500",
      link: "https://financewatch.app/",
      isCurrentApp: false
    },
    {
      name: "Felix CheckBook",
      description: "Check printing & mailing",
      icon: FileCheck,
      bgColor: "bg-emerald-500",
      link: "https://felixcheck.com/",
      isCurrentApp: false
    },
    {
      name: "SavingsPro",
      description: "Smart savings strategies",
      icon: PiggyBank,
      bgColor: "bg-pink-500",
      link: "https://savingspro.app",
      isCurrentApp: false
    },
    {
      name: "WealthWatch",
      description: "Track Your Cash Flow, Build Your Wealth",
      icon: Wallet,
      bgColor: "bg-amber-500",
      link: "https://wealth-watch.app",
      isCurrentApp: false
    }
  ];

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold mb-2">About Debt to Legacy LLC</h3>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Debt to Legacy is a personal finance and debt management consulting business that equips individuals 
            with practical tools to regain control of their money, eliminate debt, and build lasting wealth. 
            Through comprehensive solutions, we guide clients step by step from financial struggle to financial 
            freedom and legacy building.
          </p>
        </div>
        
        <h4 className="text-lg font-semibold mb-2 text-center">Complete Financial Suite</h4>
        <p className="text-muted-foreground mb-6 text-center text-sm">
          Explore our comprehensive range of financial tools and services
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {tools.map((tool) => {
            const IconComponent = tool.icon;
            
            return (
              <a
                key={tool.name}
                href={tool.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`bg-card rounded-lg p-4 border text-center transition-all hover:shadow-md hover:border-primary/50 ${
                  tool.isCurrentApp ? 'border-primary border-2 ring-2 ring-primary/20' : 'border-border'
                }`}
              >
                <div className={`w-12 h-12 ${tool.bgColor} rounded-lg flex items-center justify-center mb-3 mx-auto`}>
                  <IconComponent className="text-white" size={24} />
                </div>
                <h4 className="font-medium mb-1 flex items-center justify-center gap-1">
                  {tool.name}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </h4>
                <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>
                {tool.isCurrentApp && (
                  <Badge className="text-xs bg-primary text-primary-foreground">
                    You're Here
                  </Badge>
                )}
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

