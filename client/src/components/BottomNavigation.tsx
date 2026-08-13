import { useLocation } from "wouter";
import { Home, Calendar, BarChart3, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottomNavigation() {
  const [location, navigate] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/reports", icon: BarChart3, label: "Reports" },
    { path: "/accounts", icon: Building2, label: "Accounts" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700 shadow-lg z-50"
      data-testid="bottom-navigation"
    >
      <div className="flex items-center justify-evenly py-2 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center space-y-0.5 py-1.5 px-1 h-auto rounded-lg transition-all duration-200 min-w-0 flex-1 ${
                isActive 
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-2' : 'stroke-1'} flex-shrink-0`} />
              <span className="text-[10px] font-medium leading-tight truncate w-full text-center">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
