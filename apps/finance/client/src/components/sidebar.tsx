import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, HelpCircle, CreditCard } from "lucide-react";
import { CreditCardPaymentForm } from "@/components/credit-card-payment-form";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: "fas fa-chart-pie",
  },
  {
    name: "Accounts",
    href: "/accounts",
    icon: "fas fa-university",
  },
  {
    name: "Transfers",
    href: "/transfers",
    icon: "fas fa-exchange-alt",
  },
  {
    name: "Categories",
    href: "/categories",
    icon: "fas fa-tags",
  },
  {
    name: "Businesses",
    href: "/businesses",
    icon: "fas fa-briefcase",
  },
  {
    name: "Cash Flow",
    href: "/cash-flow",
    icon: "fas fa-chart-line",
  },
  {
    name: "Balance Sheet",
    href: "/balance-sheet",
    icon: "fas fa-balance-scale",
  },
  {
    name: "Reports",
    href: "/reports",
    icon: "fas fa-chart-line",
  },
  {
    name: "Help",
    href: "/help",
    icon: HelpCircle,
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCreditCardPayment, setShowCreditCardPayment] = useState(false);

  return (
    <>
      {/* Mobile header with menu and logout */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-50 flex items-center justify-between p-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          data-testid="button-mobile-menu"
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
        
        <h1 className="text-lg font-bold text-foreground">FinanceWatch</h1>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/api/logout'}
          data-testid="button-mobile-logout"
        >
          <LogOut size={16} />
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40" 
          onClick={() => setIsMobileMenuOpen(false)}
          data-testid="mobile-menu-overlay"
        ></div>
      )}

      <aside className={cn(
        "w-64 bg-card border-r border-border flex-shrink-0 transition-transform duration-300 ease-in-out z-40 flex flex-col",
        "md:translate-x-0 md:static md:z-auto md:h-screen",
        isMobileMenuOpen ? "fixed inset-y-0 left-0 translate-x-0 mt-16" : "fixed inset-y-0 left-0 -translate-x-full md:translate-x-0 md:mt-0"
      )}>
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <i className="fas fa-receipt text-primary"></i>
          FinanceWatch
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Account Management</p>
      </div>
      
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors",
              location === item.href
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
            data-testid={`nav-${item.name.toLowerCase()}`}
          >
            {typeof item.icon === 'string' ? (
              <i className={`${item.icon} w-4`}></i>
            ) : (
              <item.icon size={16} />
            )}
            {item.name}
          </Link>
        ))}

        <button
          onClick={() => {
            setShowCreditCardPayment(true);
            setIsMobileMenuOpen(false);
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors text-foreground hover:bg-accent w-full text-left"
        >
          <CreditCard size={16} />
          Pay Credit Card
        </button>
      </nav>

      <div className="p-4 space-y-3 mt-auto">
        <div className="bg-accent rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Today's Balance Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-secondary rounded-full"></div>
            <span className="text-sm font-medium text-foreground">Reconciled</span>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.location.href = '/api/logout'}
          data-testid="button-logout"
        >
          <i className="fas fa-sign-out-alt mr-2"></i>
          Logout
        </Button>
      </div>
    </aside>

      <CreditCardPaymentForm open={showCreditCardPayment} onOpenChange={setShowCreditCardPayment} />
    </>
  );
}
