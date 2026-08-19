import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@income/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@income/components/ui/card";
import { Badge } from "@income/components/ui/badge";
import { Alert, AlertDescription } from "@income/components/ui/alert";
import { AlertCircle, Target, TrendingDown, Heart, X } from "lucide-react";
import { apiRequest } from "@income/lib/queryClient";
import { toast } from "@income/hooks/use-toast";
import type { User as UserType } from "@income/lib/types";

interface LevelState {
  currentLevel: string;
  highestLevel: string; 
  performingAt: string;
  status: string;
  runRateWeekly: number;
  graceStartAt: string | null;
  downgradeOfferedAt: string | null;
  levelTargets: any;
}

interface PerformanceBadgeProps {
  currentLevel: string;
  performingAt: string;
  status: string;
}

function PerformanceBadge({ currentLevel, performingAt, status }: PerformanceBadgeProps) {
  if (status === 'normal' || currentLevel === performingAt) {
    return null; // No badge needed when performing at level
  }

  const levelName = performingAt.charAt(0).toUpperCase() + performingAt.slice(1);
  
  return (
    <Badge 
      variant="outline" 
      className="mt-2 text-xs bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
      data-testid="badge-performance"
    >
      Currently performing at {levelName} range — we've got your back
    </Badge>
  );
}

interface SupportModePanelProps {
  status: string;
  currentLevel: string;
  onAdjustTarget: () => void;
  onMoveBack: () => void;
}

function SupportModePanel({ status, currentLevel, onAdjustTarget, onMoveBack }: SupportModePanelProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (status === 'normal') {
      localStorage.removeItem('supportPanelDismissed');
      setIsDismissed(false);
      return;
    }

    const dismissed = localStorage.getItem('supportPanelDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [status]);

  const handleDismiss = () => {
    localStorage.setItem('supportPanelDismissed', 'true');
    setIsDismissed(true);
  };

  if (status === 'normal' || isDismissed) return null;

  const isHeadwinds = status === 'headwinds';
  const isSupport = status === 'support';

  return (
    <Card className="mt-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950" data-testid="panel-support-mode">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Heart className="w-4 h-4" />
            {isHeadwinds ? "Navigating Headwinds" : "Support Mode"}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
            data-testid="button-dismiss-support"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Income can be uneven. Here are three quick moves you can use today:
        </p>
        
        {/* Quick Cash Suggestions */}
        <Alert className="border-amber-200 dark:border-amber-700 bg-amber-25 dark:bg-amber-900">
          <Target className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Try <strong>Ask Felix</strong> below for immediate opportunities matched to your skills.
          </AlertDescription>
        </Alert>

        {/* Target Adjustment */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { onAdjustTarget(); handleDismiss(); }}
          className="w-full text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
          data-testid="button-adjust-target"
        >
          Lower this week's goal by 20%
        </Button>

        {/* End-of-grace options for support mode */}
        {isSupport && (
          <div className="pt-2 border-t border-amber-200 dark:border-amber-700">
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              Do you want to adjust your target, keep your level, or move back for now?
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDismiss}
                className="flex-1 min-w-0 border-amber-200 dark:border-amber-700"
                data-testid="button-keep-level"
              >
                Keep Level
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { onAdjustTarget(); handleDismiss(); }}
                className="flex-1 min-w-0 border-amber-200 dark:border-amber-700"
                data-testid="button-adjust-level-target"
              >
                Adjust Target
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { onMoveBack(); handleDismiss(); }}
                className="flex-1 min-w-0 border-amber-200 dark:border-amber-700"
                data-testid="button-move-back"
              >
                Move Back
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LevelManagement() {
  const queryClient = useQueryClient();
  const [showAdjustTarget, setShowAdjustTarget] = useState(false);

  const { data: levelState } = useQuery<LevelState>({
    queryKey: ['/api/income-lift/level/state'],
    refetchInterval: 30000, // Check every 30 seconds for status changes
  });

  const adjustWeeklyGoalMutation = useMutation({
    mutationFn: async (params: { goalField: string; newGoal: number }) => {
      console.log('Adjusting goal:', params);
      return apiRequest('POST', `/api/income-lift/user/adjust-weekly-goal`, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/level/state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/user'] });
      toast({
        title: "Goal adjusted",
        description: "Your goal has been lowered by 20%. Grace period reset.",
      });
    },
    onError: (error: any) => {
      console.error('Failed to adjust goal:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to adjust goal. Please try again.",
        variant: "destructive",
      });
    }
  });

  const moveBackMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/income-lift/level/move-back`, 'POST', {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/level/state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/level/progress'] });
      toast({
        title: "Level updated",
        description: `Moved back to ${data.newLevel}. Your highest achievement is preserved.`,
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to move back level. Please try again.",
        variant: "destructive",
      });
    }
  });

  const { data: user } = useQuery<UserType>({
    queryKey: ['/api/income-lift/user'],
  });

  const handleAdjustTarget = () => {
    console.log('handleAdjustTarget called. User:', user);
    
    if (!user) {
      console.error('No user found');
      toast({
        title: "Error",
        description: "User data not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    // Determine which goal to adjust based on primary goal type
    const primaryGoalType = user.primaryGoalType || 'weekly';
    let currentGoal = 0;
    let goalField = '';
    
    if (primaryGoalType === 'daily' && user.dailyGoal) {
      currentGoal = parseFloat(user.dailyGoal);
      goalField = 'dailyGoal';
    } else if (primaryGoalType === 'monthly' && user.monthlyGoal) {
      currentGoal = parseFloat(user.monthlyGoal);
      goalField = 'monthlyGoal';
    } else if (primaryGoalType === 'yearly' && user.yearlyGoal) {
      currentGoal = parseFloat(user.yearlyGoal);
      goalField = 'yearlyGoal';
    } else if (user.weeklyGoal) {
      currentGoal = parseFloat(user.weeklyGoal);
      goalField = 'weeklyGoal';
    }
    
    if (!currentGoal || currentGoal === 0) {
      console.error('No goal set. Primary goal type:', primaryGoalType);
      toast({
        title: "Cannot adjust goal",
        description: "You need to set a goal first in the Goals tab.",
        variant: "destructive",
      });
      return;
    }
    
    // Reduce primary goal by 20%
    const newGoal = Math.round(currentGoal * 0.8 * 100) / 100; // Keep 2 decimal places
    
    console.log('Primary goal type:', primaryGoalType, 'Current goal:', currentGoal, 'New goal:', newGoal);
    
    if (newGoal > 0) {
      adjustWeeklyGoalMutation.mutate({ goalField, newGoal });
    } else {
      toast({
        title: "Cannot adjust goal",
        description: "Calculated goal is too low. Please set a higher goal first.",
        variant: "destructive",
      });
    }
  };

  const handleMoveBack = () => {
    moveBackMutation.mutate();
  };

  // Only show level management for users who have achieved higher levels
  const shouldShowLevelManagement = levelState && (
    levelState.currentLevel !== 'foundation' || // Currently above foundation
    levelState.highestLevel !== 'foundation' ||  // Has previously achieved higher
    levelState.highestLevel !== levelState.currentLevel // Has been moved back
  );

  if (!levelState || !shouldShowLevelManagement) return null;

  return (
    <div className="space-y-4" data-testid="container-level-management">
      {/* Performance Badge */}
      <PerformanceBadge 
        currentLevel={levelState.currentLevel}
        performingAt={levelState.performingAt}
        status={levelState.status}
      />

      {/* Support Mode Panel */}
      <SupportModePanel 
        status={levelState.status}
        currentLevel={levelState.currentLevel}
        onAdjustTarget={handleAdjustTarget}
        onMoveBack={handleMoveBack}
      />

      {/* Highest Level Achievement (always show if different from current) */}
      {levelState.highestLevel !== levelState.currentLevel && (
        <div className="text-center">
          <Badge 
            variant="secondary" 
            className="text-xs bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
            data-testid="badge-highest-level"
          >
            Highest Level Reached: {levelState.highestLevel.charAt(0).toUpperCase() + levelState.highestLevel.slice(1)}
          </Badge>
        </div>
      )}
    </div>
  );
}

