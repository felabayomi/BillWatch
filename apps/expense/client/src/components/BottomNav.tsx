import { Receipt, BarChart3, Scan, Settings, Landmark } from "lucide-react";
import { useLocation } from "wouter";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navItems: NavItem[] = [
  { id: "expenses", label: "Expenses", icon: Receipt, path: "/expense" },
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/expense/analytics" },
  { id: "scanner", label: "Scanner", icon: Scan, path: "/expense/scanner" },
  { id: "accounts", label: "Accounts", icon: Landmark, path: "/expense/accounts" },
  { id: "settings", label: "Settings", icon: Settings, path: "/expense/settings" },
];

export function BottomNav() {
  const [location, navigate] = useLocation();

  const isActive = (path: string) => {
    if (path === "/expense") {
      return location === "/expense" || location === "/";
    }
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-xs ${active ? "font-medium" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
