import { Home, Plus, Zap, BarChart3, Settings } from "lucide-react";
import { useLocation } from "wouter";

export default function MobileNav() {
  const [location] = useLocation();
  
  const handleScrollToSection = (sectionId: string) => {
    // First navigate to home page if not already there
    if (location !== '/') {
      window.location.href = '/#' + sectionId;
    } else {
      // If already on home page, find the section by text content or className
      let element = document.getElementById(sectionId);
      
      if (!element) {
        // Fallback: search for the component by its heading text
        if (sectionId === 'daily-tracker') {
          const headings = Array.from(document.querySelectorAll('h3'));
          element = headings.find(h => h.textContent?.includes('Daily Income Tracker'))?.closest('section, div[class*="card"], .card') as HTMLElement || null;
        } else if (sectionId === 'quick-cash') {
          const headings = Array.from(document.querySelectorAll('h3'));
          element = headings.find(h => h.textContent?.includes('Ask Felix'))?.closest('section, div[class*="card"], .card') as HTMLElement || null;
        } else if (sectionId === 'progress') {
          const headings = Array.from(document.querySelectorAll('h3'));
          element = headings.find(h => h.textContent?.includes('Financial Journey'))?.closest('section, div[class*="card"], .card') as HTMLElement || null;
        }
      }
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleHomeClick = () => {
    if (location === '/') {
      // If already on home page, scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // If not on home page, the Link will handle navigation
  };

  const handleSettingsClick = () => {
    // Always scroll to top when navigating to settings
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { 
      icon: Home, 
      label: "Home", 
      href: "/", 
      isActive: location === "/",
      onClick: handleHomeClick
    },
    { icon: Plus, label: "Track", action: () => handleScrollToSection('daily-tracker'), isActive: false },
    { icon: Zap, label: "Ask Felix", action: () => handleScrollToSection('quick-cash'), isActive: false },
    { icon: Settings, label: "Goals", action: () => handleScrollToSection('progress'), isActive: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 md:hidden z-40 shadow-lg">
      <div className="grid grid-cols-4 py-3">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          
          // If it has an href, use Link, otherwise use button with action
          if (item.href) {
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={item.onClick}
                className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700 ${
                  item.isActive ? 'text-blue-400' : 'text-gray-300 hover:text-white'
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <IconComponent size={22} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </a>
            );
          } else {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700 ${
                  item.isActive ? 'text-blue-400' : 'text-gray-300 hover:text-white'
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <IconComponent size={22} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          }
        })}
      </div>
    </nav>
  );
}

