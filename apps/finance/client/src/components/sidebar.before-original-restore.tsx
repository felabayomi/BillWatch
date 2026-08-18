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

  const [
    showCreditCardPayment,
    setShowCreditCardPayment,
  ] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
            <WalletCards className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">
              FinanceWatch
            </h1>

            <p className="text-xs text-muted-foreground">
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
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setShowCreditCardPayment(true)
          }
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <CreditCard className="h-4 w-4 shrink-0" />
          Pay Credit Card
        </button>
      </nav>

      <div className="border-t border-border p-3">
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
    </>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Open FinanceWatch navigation"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-20 z-[120] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={cn(
          "fixed inset-0 z-[120] transition-opacity duration-200 lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          aria-label="Close FinanceWatch navigation"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-slate-950/40 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          className={cn(
            "absolute left-0 top-0 flex h-full w-[82vw] max-w-[320px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card shadow-2xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
                <WalletCards className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-foreground">FinanceWatch</span>
            </div>

            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {navContent}
        </aside>
      </div>

      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        {navContent}
      </aside>

      <CreditCardPaymentForm
        open={showCreditCardPayment}
        onOpenChange={setShowCreditCardPayment}
      />
    </>
  );
}
