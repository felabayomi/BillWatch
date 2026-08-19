import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { Button } from "@income/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import GoalSetting from "@income/components/goal-setting";
import LevelTargets from "@income/components/level-targets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@income/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@income/components/ui/dialog";
import { User, Settings, Eye, ChevronDown, Target, Trophy, BookOpen, Shield, HelpCircle, LogOut, History, Wallet } from "lucide-react";
import type { User as UserType } from "@income/lib/types";

interface UserProfileProps {
  onViewWelcome?: () => void;
}

export default function UserProfile({ onViewWelcome }: UserProfileProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showGoalSetting, setShowGoalSetting] = useState(false);
  const [showLevelTargets, setShowLevelTargets] = useState(false);
  const queryClient = useQueryClient();

  // Cleanup modals on unmount to prevent state conflicts
  useEffect(() => {
    return () => {
      setShowSettings(false);
      setShowGoalSetting(false);
      setShowLevelTargets(false);
    };
  }, []);

  const { data: user } = useQuery<UserType>({
    queryKey: ['/api/income-lift/user'],
  });

  const viewWelcomeMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', '/api/income-lift/user', { showManifesto: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/user'] });
      if (onViewWelcome) {
        onViewWelcome();
      }
    },
  });

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  const handleViewWelcome = () => {
    viewWelcomeMutation.mutate();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="p-3 hover:bg-muted rounded-full border-2 border-primary/20 hover:border-primary/40 shadow-sm" 
            data-testid="button-profile"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-medium text-sm">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-medium">
            {user?.username || 'User'}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleViewWelcome}
            disabled={viewWelcomeMutation.isPending}
          >
            <Eye className="mr-2 h-4 w-4" />
            {viewWelcomeMutation.isPending ? "Loading..." : "View Welcome Message"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="text-red-600 dark:text-red-400"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
            <DialogDescription>
              Manage your IncomeLift preferences and account settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <div className="mr-3 p-2 bg-green-100 dark:bg-green-900 rounded-full">
                    <User className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  Profile & Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Manage your income goals and personal preferences.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowGoalSetting(true)}
                  data-testid="button-set-goals"
                >
                  <Target className="mr-2 h-4 w-4" />
                  Edit Goals & Targets
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowLevelTargets(true)}
                  data-testid="button-set-level-targets"
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Set Level Targets
                </Button>
              </CardContent>
            </Card>

            {/* Income & Reflections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <div className="mr-3 p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <BookOpen className="text-purple-600 dark:text-purple-400" size={24} />
                  </div>
                  History & Reflections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  View your income history and weekly reflections.
                </p>
                <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowSettings(false);
                      window.location.href = "/income/income-history";
                    }}
                    data-testid="button-income-history"
                  >
                    <History className="mr-2 h-4 w-4" />
                    View Income History
                </Button>
                <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowSettings(false);
                      window.location.href = "/income/reflections";
                    }}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    View All Reflections
                </Button>
              </CardContent>
            </Card>

            {/* Accounts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <div className="mr-3 p-2 bg-teal-100 dark:bg-teal-900 rounded-full">
                    <Wallet className="text-teal-600 dark:text-teal-400" size={24} />
                  </div>
                  Accounts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Manage your deposit accounts for FinanceWatch income syncing.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowSettings(false);
                    window.location.href = "/income/accounts";
                  }}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Manage Accounts
                </Button>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <div className="mr-3 p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Shield className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted and secure. Manage privacy settings.
                </p>
                <Button variant="outline" className="w-full">
                  Privacy Settings
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleViewWelcome}
                  disabled={viewWelcomeMutation.isPending}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {viewWelcomeMutation.isPending ? "Loading..." : "View Welcome Message"}
                </Button>
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <div className="mr-3 p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
                    <HelpCircle className="text-orange-600 dark:text-orange-400" size={24} />
                  </div>
                  Help & Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Get help, view FAQ, and contact support.
                </p>
                <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setShowSettings(false);
                      window.location.href = "/income/faq";
                    }}
                  >
                    View FAQ
                </Button>
                <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setShowSettings(false);
                      window.location.href = "/income/how-to-use";
                    }}
                  >
                    How to Use Guide
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGoalSetting} onOpenChange={setShowGoalSetting}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Income Goal Settings</DialogTitle>
            <DialogDescription>
              Set your custom income targets to track your progress effectively.
            </DialogDescription>
          </DialogHeader>
          {user && (
            <GoalSetting 
              user={user} 
              onClose={() => setShowGoalSetting(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLevelTargets} onOpenChange={setShowLevelTargets}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Level Target Settings</DialogTitle>
            <DialogDescription>
              Set targets for each level to track your progression and auto-advance when achieved.
            </DialogDescription>
          </DialogHeader>
          {user && (
            <LevelTargets 
              user={user} 
              onClose={() => setShowLevelTargets(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}



