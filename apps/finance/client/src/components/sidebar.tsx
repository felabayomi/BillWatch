import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  CreditCard,
  HelpCircle,
  Landmark,
  Menu,
  ReceiptText,
  Tags,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import { cn } from "@finance/lib/utils";
import { Button } from "@finance/components/ui/button";
import { CreditCardPaymentForm } from "@finance/components/credit-card-payment-form";

const navigation = [
  {
    name: "Dashboard",
    href: "/finance",
    icon: BarChart3,
  },
  {
    name: "Accounts",
    href: "/finance/accounts",
    icon: WalletCards,
  },
  {
    name: "Transfers",
    href: "/finance/transfers",
    icon: ArrowLeftRight,
  },
  {
    name: "Categories",
    href: "/finance/categories",
    icon: Tags,
  },
  {
    name: "Businesses",
    href: "/finance/businesses",
    icon: Building2,
  },
  {
    name: "Cash Flow",
    href: "/finance/cash-flow",
    icon: TrendingUp,
  },
  {
    name: "Balance Sheet",
    href: "/finance/balance-sheet",
    icon: Landmark,
  },
  {
    name: "Reports",
    href: "/finance/reports",
    icon: ReceiptText,
  },
  {
    name: "Help",
    href: "/finance/help",
    icon: HelpCircle,
  },
];

function isActiveRoute(location: string, href: string) {
  if (href === "/finance") {
    return location === "/finance";
  }

  return (
    location === href ||
    location.startsWith(`${href}/`)
  );
}

export function Sidebar() {
  const [location] = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [
    showCreditCardPayment,
    setShowCreditCardPayment,
  ] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/*
       * MOBILE / PHONE LANDSCAPE TOOLBAR
       *
       * Financial OS PlatformNav is 3.5rem high
       * and already occupies the top of the screen.
       *
       * This toolbar sits DIRECTLY BELOW it.
       *
       * lg:hidden is intentional:
       * iPhones in landscape should still use
       * the drawer instead of the desktop sidebar.
       */}
      <div className="fixed left-0 right-0 top-14 z-[80] flex h-14 items-center border-b border-border bg-card/95 px-4 shadow-sm backdrop-blur lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setIsMobileMenuOpen((open) => !open)
          }
          className="gap-2"
          data-testid="button-mobile-menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}

          <span>
            {isMobileMenuOpen
              ? "Close menu"
              : "Finance menu"}
          </span>
        </Button>
      </div>

      {/*
       * MOBILE OVERLAY
       *
       * Starts BELOW both:
       *
       * Financial OS nav = 3.5rem
       * Finance toolbar   = 3.5rem
       *
       * Total = 7rem / top-28
       */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close FinanceWatch menu"
          className="fixed bottom-0 left-0 right-0 top-28 z-[90] bg-slate-950/50 lg:hidden"
          onClick={closeMobileMenu}
          data-testid="mobile-menu-overlay"
        />
      )}

      {/*
       * FINANCEWATCH SIDEBAR
       *
       * Mobile:
       *   drawer
       *
       * Phone landscape:
       *   drawer
       *
       * Desktop >= lg:
       *   normal left column
       */}
      <aside
        className={cn(
          "w-64 shrink-0 flex-col border-r border-border bg-white",

          /*
           * Desktop
           */
          "hidden lg:flex lg:min-h-[calc(100vh-3.5rem)]",

          /*
           * Mobile drawer
           */
          isMobileMenuOpen &&
  "fixed bottom-0 left-0 top-28 z-[100] flex bg-white shadow-2xl lg:static lg:shadow-none",
        )}
      >
        <div className="border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <WalletCards className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-foreground">
                FinanceWatch
              </h1>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Account Management
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active = isActiveRoute(
              location,
              item.href,
            );

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent",
                )}
                data-testid={`nav-${item.name
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span>{item.name}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setShowCreditCardPayment(true);
              closeMobileMenu();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            Pay Credit Card
          </button>
        </nav>

        <div className="mt-auto border-t border-border p-3">
          <div className="rounded-xl bg-accent p-3">
            <div className="mb-1 text-xs text-muted-foreground">
              Today's Balance Status
            </div>

            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-sm font-medium text-foreground">
                Reconciled
              </span>
            </div>
          </div>
        </div>
      </aside>

      <CreditCardPaymentForm
        open={showCreditCardPayment}
        onOpenChange={
          setShowCreditCardPayment
        }
      />
    </>
  );
}