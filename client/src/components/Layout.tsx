import { BottomNavigation } from "./BottomNavigation";
import { InstallPrompt } from "./InstallPrompt";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="max-w-md mx-auto bg-card shadow-xl min-h-screen relative">
      {children}
      {isAuthenticated && <BottomNavigation />}
      <InstallPrompt />
    </div>
  );
}
