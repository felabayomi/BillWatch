import { Card, CardContent } from "@income/components/ui/card";
import { Badge } from "@income/components/ui/badge";
import { Shield, Scale, TrendingUp, Crown, Check, Clock, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@income/lib/types";

interface ProgressMapProps {
  currentLevel: string;
}

export default function ProgressMap({ currentLevel }: ProgressMapProps) {
  // Get level progress data
  const { data: levelProgress } = useQuery<{advanced: boolean; earned: number; target: number}>({
    queryKey: ['/api/income-lift/level/progress'],
    staleTime: 5 * 60 * 1000,
  });

  // Get user data  
  const { data: user } = useQuery<User>({
    queryKey: ['/api/income-lift/user'],
    staleTime: 5 * 60 * 1000,
  });

  // Calculate actual progress percentage using same logic as home.tsx
  const calculateProgressPercent = () => {
    if (!levelProgress || !user) return 0;
    
    const weeklyGoal = parseFloat(user.weeklyGoal || '0');
    const monthlyGoal = parseFloat(user.monthlyGoal || '0');
    const yearlyGoal = parseFloat(user.yearlyGoal || '0');
    const dailyGoal = parseFloat(user.dailyGoal || '0');
    
    const hasAnyGoals = weeklyGoal > 0 || monthlyGoal > 0 || yearlyGoal > 0 || dailyGoal > 0;
    if (!hasAnyGoals) return 0;

    const primaryType = user.primaryGoalType || 'weekly';
    let currentGoal = 0;
    let earned = levelProgress.earned || 0;

    if (primaryType === 'daily') {
      currentGoal = dailyGoal;
    } else if (primaryType === 'monthly') {
      currentGoal = monthlyGoal;
    } else if (primaryType === 'yearly') {
      currentGoal = yearlyGoal;
    } else {
      currentGoal = weeklyGoal;
    }

    if (currentGoal <= 0) return 0;
    
    // Same calculation as home.tsx - progress toward 85% of goal
    return (earned / (currentGoal * 0.85)) * 100;
  };

  const progressPercent = Math.round(calculateProgressPercent());
  const displayPercent = Math.min(progressPercent, 100); // Cap visual display at 100%
  const levels = [
    {
      id: 'foundation',
      name: 'Foundation',
      icon: Shield,
      gradient: 'gradient-foundation',
      color: 'text-green-700',
      milestones: [
        'Track daily income',
        'Build awareness of money flow',
        'Start covering essential needs'
      ]
    },
    {
      id: 'stability',
      name: 'Stability',
      icon: Scale,
      gradient: 'gradient-stability',
      color: 'text-yellow-700',
      milestones: [
        'Complete 3 consistent weeks',
        'Build your emergency fund',
        'Create multiple income streams'
      ]
    },
    {
      id: 'growth',
      name: 'Growth',
      icon: TrendingUp,
      gradient: 'gradient-growth',
      color: 'text-blue-700',
      milestones: [
        'Reach your first $1,000 saved',
        'Scale your best income source',
        'Begin building investments'
      ]
    },
    {
      id: 'legacy',
      name: 'Legacy',
      icon: Crown,
      gradient: 'gradient-legacy',
      color: 'text-purple-700',
      milestones: [
        'Maintain consistent investing',
        'Develop passive income streams',
        'Build lasting wealth'
      ]
    }
  ];

  const getCurrentLevelIndex = () => {
    const normalizedLevel = currentLevel === 'survival' ? 'foundation' : currentLevel;
    return levels.findIndex(level => level.id === normalizedLevel);
  };

  const currentLevelIndex = getCurrentLevelIndex();

  const getLevelStatus = (index: number) => {
    if (index < currentLevelIndex) return 'completed';
    if (index === currentLevelIndex) return 'current';
    return 'locked';
  };

  const getStatusIcon = (status: string, index: number) => {
    switch (status) {
      case 'completed':
        return <Check className="text-green-500" size={16} />;
      case 'current':
        return <Clock className={levels[index].color} size={16} />;
      default:
        return <Lock className="text-muted-foreground" size={16} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'current':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Locked</Badge>;
    }
  };

  return (
    <section id="progress" className="scroll-mt-4">
      <Card>
        <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-6">Your Financial Journey</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {levels.map((level, index) => {
            const status = getLevelStatus(index);
            const IconComponent = level.icon;
            const isActive = status === 'completed' || status === 'current';
            
            return (
              <div key={level.id} className="text-center">
                <div className={`w-16 h-16 ${isActive ? level.gradient : 'bg-muted'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <IconComponent 
                    className={isActive ? 'text-white' : 'text-muted-foreground'} 
                    size={24} 
                  />
                </div>
                <h4 className={`font-semibold mb-2 ${isActive ? level.color : 'text-muted-foreground'}`}>
                  {level.name}
                </h4>
                <div className="mb-3">
                  {getStatusBadge(status)}
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {level.milestones.map((milestone, milestoneIndex) => (
                    <li key={milestoneIndex} className="flex items-center text-left">
                      {status === 'completed' ? (
                        <Check className="text-green-500 mr-2 flex-shrink-0" size={12} />
                      ) : status === 'current' && milestoneIndex === 0 ? (
                        <Clock className={`${level.color} mr-2 flex-shrink-0`} size={12} />
                      ) : (
                        getStatusIcon(status, index)
                      )}
                      <span className={milestoneIndex < 1 && status === 'current' ? level.color : ''}>{milestone}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 bg-secondary rounded-lg p-4">
          {progressPercent === 0 && user && (parseFloat(user.weeklyGoal || '0') <= 0 && parseFloat(user.monthlyGoal || '0') <= 0 && parseFloat(user.yearlyGoal || '0') <= 0 && parseFloat(user.dailyGoal || '0') <= 0) ? (
            <div className="text-center">
              <h5 className="font-medium text-orange-600">Set Your Goals to Track Progress</h5>
              <p className="text-sm text-muted-foreground mb-3">
                You've earned ${levelProgress?.earned || 0} so far! Set your income goals to see your progress toward the next level.
              </p>
              <p className="text-xs text-muted-foreground">
                Tap the user icon (👤) at the top right → Profile & Goals to get started
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium">Progress Toward Stability</h5>
                  <p className="text-sm text-muted-foreground">
                    You're making steady progress toward Stability level ({progressPercent}% so far)
                  </p>
                </div>
                <div className="text-sm font-medium text-primary" data-testid="text-progress-status">{progressPercent}%</div>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-3">
                <div className="bg-primary h-2 rounded-full progress-bar" style={{width: `${progressPercent}%`}}></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Every dollar tracked builds your foundation - keep going!</p>
            </>
          )}
        </div>
        </CardContent>
      </Card>
    </section>
  );
}


