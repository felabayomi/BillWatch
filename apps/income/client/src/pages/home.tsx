import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@income/hooks/use-mobile";
import { ChartLine } from "lucide-react";
import type { User as UserType, IncomeEntry } from "@income/lib/types";
import Manifesto from "@income/components/manifesto";
import DailyTracker from "@income/components/daily-tracker";
import QuickCashGenerator from "@income/components/quick-cash-generator";
import ProgressMap from "@income/components/progress-map";
import WeeklySummary from "@income/components/weekly-summary";
import IntegrationPanel from "@income/components/integration-panel";
import Footer from "@income/components/footer";
import MobileNav from "@income/components/mobile-nav";
import UserProfile from "@income/components/user-profile";
import LevelManagement from "@income/components/level-management";

export default function Home() {
  const isMobile = useIsMobile();
  const [showManifesto, setShowManifesto] = useState(false); // Start as false until we know user needs it

  const { data: user } = useQuery<UserType>({
    queryKey: ['/api/income-lift/user'],
  });

  // Update local state based on user data
  useEffect(() => {
    if (user) {
      setShowManifesto(user.showManifesto);
    }
  }, [user]);

  // Scroll to top when transitioning from manifesto to main app
  useEffect(() => {
    if (!showManifesto) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showManifesto]);

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const { data: todaysIncome = [] } = useQuery<IncomeEntry[]>({
    queryKey: ['/api/income-lift/income/today', userTimezone],
    queryFn: () => fetch(`/api/income-lift/income/today?timezone=${encodeURIComponent(userTimezone)}`).then(res => res.json()),
    staleTime: 0, // Update immediately when income is added
  });

  const { data: weeklyIncome = [] } = useQuery<IncomeEntry[]>({
    queryKey: ['/api/income-lift/income/week', userTimezone],
    queryFn: () => fetch(`/api/income-lift/income/week?timezone=${encodeURIComponent(userTimezone)}`).then(res => res.json()),
    staleTime: 0, // Update immediately when income is added
  });

  const { data: levelProgress } = useQuery<{
    advanced: boolean;
    to?: string;
    earned: number;
    target: number;
  }>({
    queryKey: ['/api/income-lift/level/progress'],
  });

  // Calculate today's total
  const todaysTotal = todaysIncome.reduce((sum: number, entry: IncomeEntry) => sum + parseFloat(entry.amount), 0);

  // Calculate weekly total and progress
  const weeklyTotal = weeklyIncome.reduce((sum: number, entry: IncomeEntry) => sum + parseFloat(entry.amount), 0);
  const weeklyGoal = parseFloat(user?.weeklyGoal || '0');
  
  // Check if user has set ANY goals (not just weekly)
  const hasAnyGoals = (
    (user?.dailyGoal && parseFloat(user.dailyGoal) > 0) ||
    (user?.weeklyGoal && parseFloat(user.weeklyGoal) > 0) ||
    (user?.monthlyGoal && parseFloat(user.monthlyGoal) > 0) ||
    (user?.yearlyGoal && parseFloat(user.yearlyGoal) > 0)
  );
  
  const hasWeeklyGoal = weeklyGoal > 0;
  const weeklyProgress = hasWeeklyGoal ? Math.min((weeklyTotal / weeklyGoal) * 100, 100) : 0;

  // Calculate bills covered based on any goal type (convert to weekly equivalent)
  const getWeeklyEquivalentGoal = () => {
    if (user?.weeklyGoal && parseFloat(user.weeklyGoal) > 0) {
      return parseFloat(user.weeklyGoal);
    }
    if (user?.dailyGoal && parseFloat(user.dailyGoal) > 0) {
      return parseFloat(user.dailyGoal) * 7;
    }
    if (user?.monthlyGoal && parseFloat(user.monthlyGoal) > 0) {
      return parseFloat(user.monthlyGoal) / 4.33;
    }
    if (user?.yearlyGoal && parseFloat(user.yearlyGoal) > 0) {
      return parseFloat(user.yearlyGoal) / 52;
    }
    return 0;
  };

  // Calculate progress based on user's primary goal timeframe
  const getPrimaryGoalInfo = () => {
    const primaryType = user?.primaryGoalType || 'weekly';
    
    if (primaryType === 'daily') {
      const dailyGoal = parseFloat(user?.dailyGoal || '0');
      const earned = todaysTotal;
      return {
        currentGoal: dailyGoal,
        earned,
        timeframe: 'daily',
        displayTotal: earned,
        gapRemaining: Math.max(dailyGoal - earned, 0)
      };
    } else if (primaryType === 'monthly') {
      const monthlyGoal = parseFloat(user?.monthlyGoal || '0');
      // Use levelProgress.earned which is calculated correctly in backend
      const earned = levelProgress?.earned || 0;
      return {
        currentGoal: monthlyGoal,
        earned,
        timeframe: 'monthly',
        displayTotal: earned,
        gapRemaining: Math.max(monthlyGoal - earned, 0)
      };
    } else if (primaryType === 'yearly') {
      const yearlyGoal = parseFloat(user?.yearlyGoal || '0');
      // Use levelProgress.earned which is calculated correctly in backend
      const earned = levelProgress?.earned || 0;
      return {
        currentGoal: yearlyGoal,
        earned,
        timeframe: 'yearly',
        displayTotal: earned,
        gapRemaining: Math.max(yearlyGoal - earned, 0)
      };
    } else {
      // Default to weekly
      const weeklyGoal = parseFloat(user?.weeklyGoal || '0');
      return {
        currentGoal: weeklyGoal,
        earned: weeklyTotal,
        timeframe: 'weekly',
        displayTotal: weeklyTotal,
        gapRemaining: Math.max(weeklyGoal - weeklyTotal, 0)
      };
    }
  };

  const goalInfo = getPrimaryGoalInfo();
  const weeklyEquivalentGoal = getWeeklyEquivalentGoal();
  const billsCoveredPercent = (hasAnyGoals && goalInfo.currentGoal > 0) ? 
    Math.min((goalInfo.earned / (goalInfo.currentGoal * 0.85)) * 100, 100) : 0;

  // Level progression tracking
  const getCurrentLevelInfo = () => {
    const currentLevel = user?.currentLevel === 'survival' ? 'foundation' : user?.currentLevel || 'foundation';
    const levels = ['foundation', 'stability', 'growth', 'legacy'];
    const currentIndex = levels.indexOf(currentLevel);
    const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
    
    // Calculate actual progress percentage using same logic as billsCoveredPercent
    const progressPercent = (hasAnyGoals && goalInfo.currentGoal > 0) ? 
      Math.round(Math.min((goalInfo.earned / (goalInfo.currentGoal * 0.85)) * 100, 100)) : 0;
    
    return {
      currentLevel: currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1),
      nextLevel: nextLevel ? nextLevel.charAt(0).toUpperCase() + nextLevel.slice(1) : null,
      levelNumber: currentIndex + 1,
      progressPercent,
      supportiveMessage: `You're making steady progress toward ${nextLevel ? nextLevel.charAt(0).toUpperCase() + nextLevel.slice(1) : 'your goals'} (${progressPercent}% so far)`
    };
  };

  const levelInfo = getCurrentLevelInfo();

  // Days remaining based on user's primary goal timeframe
  const today = new Date();
  const getDaysRemaining = () => {
    const timeframe = goalInfo.timeframe;
    
    if (timeframe === 'daily') {
      // For daily goals, always 1 day (resets daily)
      return 1;
    } else if (timeframe === 'weekly') {
      // Days remaining in current week
      return 7 - today.getDay();
    } else if (timeframe === 'monthly') {
      // Days remaining in current month
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return lastDayOfMonth.getDate() - today.getDate() + 1;
    } else if (timeframe === 'yearly') {
      // Days remaining in current year
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      const diffTime = endOfYear.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    
    // Default to weekly
    return 7 - today.getDay();
  };
  
  const daysRemaining = getDaysRemaining();

  // Scroll to top when component mounts and user doesn't need manifesto
  useEffect(() => {
    if (user && !user.showManifesto) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [user]);

  if (showManifesto) {
    return <Manifesto onComplete={() => setShowManifesto(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <ChartLine className="text-primary-foreground" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold" data-testid="app-title">IncomeLift</h1>
                <p className="text-xs text-muted-foreground mb-1">by Debt to Legacy LLC</p>
                <p className="text-sm text-muted-foreground">Bills don't wait! Neither Should Income!</p>
              </div>
            </div>
            <UserProfile onViewWelcome={() => setShowManifesto(true)} />
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className={`container mx-auto px-4 py-6 space-y-6 ${isMobile ? 'mobile-nav-padding' : ''}`}>
        {/* Progress Overview */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Level Card */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Your Foundation</h3>
                <div className="w-8 h-8 gradient-foundation rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🏗️</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2" data-testid="text-current-level">
                  {levelInfo.currentLevel}
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Level {levelInfo.levelNumber} of 4</p>
                
                {/* Level Management System */}
                <LevelManagement />
                {levelInfo.nextLevel && (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">
                      Progress toward {levelInfo.nextLevel}: {levelInfo.progressPercent}%
                    </p>
                    <div className="w-full bg-muted rounded-full h-2 mb-3 relative">
                      <div className="bg-green-500 h-2 rounded-full progress-bar" style={{width: `${Math.min(levelInfo.progressPercent, 100)}%`}}></div>
                      {/* Show overflow indicator if over 100% */}
                      {levelInfo.progressPercent > 100 && (
                        <div className="absolute right-0 top-0 h-2 w-1 bg-yellow-400 rounded-r-full animate-pulse"></div>
                      )}
                    </div>
                    <p className="text-xs text-green-600 font-medium">{levelInfo.supportiveMessage}</p>
                  </>
                )}
                
                {/* Milestone Checklist */}
                <div className="mt-4 text-left">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Foundation Milestones:</p>
                  <div className="space-y-1">
                    <div className="flex items-center text-xs">
                      <span className="text-green-500 mr-2">✅</span>
                      <span>Track daily income</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-green-500 mr-2">✅</span>
                      <span>Build awareness of money flow</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-2">⏳</span>
                      <span className="text-muted-foreground">Cover essential needs consistently</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress based on user's primary goal type */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="font-semibold mb-4">
                {user?.primaryGoalType === 'daily' ? "Today's Progress" :
                 user?.primaryGoalType === 'monthly' ? "This Month's Progress" :
                 user?.primaryGoalType === 'yearly' ? "This Year's Progress" :
                 "This Week's Progress"}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="text-weekly-total">
                    ${goalInfo.displayTotal.toFixed(0)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {goalInfo.timeframe === 'daily' ? 'Today' :
                     goalInfo.timeframe === 'monthly' ? 'This Month' :
                     goalInfo.timeframe === 'yearly' ? 'This Year' :
                     'This Week'} Earned
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600" data-testid="text-bills-covered">
                    {hasAnyGoals ? `${billsCoveredPercent.toFixed(0)}%` : 'Set Goals'}
                  </div>
                  <p className="text-sm text-muted-foreground">{hasAnyGoals ? 'Bills Covered' : 'To Track Progress'}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600" data-testid="text-gap-remaining">
                    {(hasAnyGoals && goalInfo.currentGoal > 0) ? `$${goalInfo.gapRemaining.toFixed(0)}` : (hasAnyGoals ? 'Keep Going!' : 'Start Planning')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(hasAnyGoals && goalInfo.currentGoal > 0) ? 'Still Building' : (hasAnyGoals ? 'Building Strong' : 'Your Foundation')}
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600" data-testid="text-days-remaining">
                    {daysRemaining}
                  </div>
                  <p className="text-sm text-muted-foreground">Days Left</p>
                </div>
              </div>
              {/* Show all foundation progress bars */}
              <div className="mt-6 space-y-4">
                {/* Daily Foundation */}
                {user?.dailyGoal && parseFloat(user.dailyGoal) > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Building Your Daily Foundation</span>
                      <span data-testid="text-daily-progress">
                        ${todaysTotal.toFixed(0)} / ${parseFloat(user.dailyGoal).toFixed(0)} ({Math.min(Math.round((todaysTotal / parseFloat(user.dailyGoal)) * 100), 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 relative">
                      <div className="bg-blue-500 h-3 rounded-full progress-bar" style={{width: `${Math.min((todaysTotal / parseFloat(user.dailyGoal)) * 100, 100)}%`}}></div>
                      {/* Overflow indicator for exceeding 100% */}
                      {(todaysTotal / parseFloat(user.dailyGoal)) * 100 > 100 && (
                        <div className="absolute right-0 top-0 h-3 w-1 bg-yellow-400 rounded-r-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Weekly Foundation */}
                {user && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Building Your Weekly Foundation</span>
                      <span data-testid="text-weekly-progress">
                        {user.weeklyGoal && parseFloat(user.weeklyGoal) > 0 ? (
                          `$${weeklyTotal.toFixed(0)} / $${parseFloat(user.weeklyGoal).toFixed(0)} (${Math.min(Math.round((weeklyTotal / parseFloat(user.weeklyGoal)) * 100), 100)}%)`
                        ) : (
                          <span className="text-orange-600 text-xs">Set weekly goal to track</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 relative">
                      {user.weeklyGoal && parseFloat(user.weeklyGoal) > 0 ? (
                        <>
                          <div className="bg-green-500 h-3 rounded-full progress-bar" style={{width: `${Math.min((weeklyTotal / parseFloat(user.weeklyGoal)) * 100, 100)}%`}}></div>
                          {/* Overflow indicator for exceeding 100% */}
                          {(weeklyTotal / parseFloat(user.weeklyGoal)) * 100 > 100 && (
                            <div className="absolute right-0 top-0 h-3 w-1 bg-yellow-400 rounded-r-full animate-pulse"></div>
                          )}
                        </>
                      ) : (
                        <div className="bg-orange-200 h-3 rounded-full w-full opacity-50"></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Monthly Foundation */}
                {user?.monthlyGoal && parseFloat(user.monthlyGoal) > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Building Your Monthly Foundation</span>
                      <span data-testid="text-monthly-progress">
                        ${(levelProgress?.earned || 0).toFixed(0)} / ${parseFloat(user.monthlyGoal).toFixed(0)} ({Math.min(Math.round(((levelProgress?.earned || 0) / parseFloat(user.monthlyGoal)) * 100), 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 relative">
                      <div className="bg-purple-500 h-3 rounded-full progress-bar" style={{width: `${Math.min(((levelProgress?.earned || 0) / parseFloat(user.monthlyGoal)) * 100, 100)}%`}}></div>
                      {/* Overflow indicator for exceeding 100% */}
                      {((levelProgress?.earned || 0) / parseFloat(user.monthlyGoal)) * 100 > 100 && (
                        <div className="absolute right-0 top-0 h-3 w-1 bg-yellow-400 rounded-r-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Yearly Foundation */}
                {user?.yearlyGoal && parseFloat(user.yearlyGoal) > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Building Your Yearly Foundation</span>
                      <span data-testid="text-yearly-progress">
                        ${(levelProgress?.earned || 0).toFixed(0)} / ${parseFloat(user.yearlyGoal).toFixed(0)} ({Math.min(Math.round(((levelProgress?.earned || 0) / parseFloat(user.yearlyGoal)) * 100), 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 relative">
                      <div className="bg-orange-500 h-3 rounded-full progress-bar" style={{width: `${Math.min(((levelProgress?.earned || 0) / parseFloat(user.yearlyGoal)) * 100, 100)}%`}}></div>
                      {/* Overflow indicator for exceeding 100% */}
                      {((levelProgress?.earned || 0) / parseFloat(user.yearlyGoal)) * 100 > 100 && (
                        <div className="absolute right-0 top-0 h-3 w-1 bg-yellow-400 rounded-r-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Motivational message */}
                <p className="text-xs text-primary mt-3 font-medium">
                  {billsCoveredPercent >= 100 ? 'Congratulations! You\'ve exceeded your primary goal!' : 
                   billsCoveredPercent >= 75 ? 'Excellent progress! You\'re building strong foundations across all timeframes.' :
                   billsCoveredPercent >= 50 ? 'Great momentum! Every dollar tracked builds your foundation.' :
                   'You\'re building your foundation across all timeframes - every dollar counts!'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <DailyTracker 
          todaysTotal={todaysTotal} 
          dailyGoal={user?.dailyGoal ? parseFloat(user.dailyGoal) : (hasWeeklyGoal ? weeklyGoal / 7 : 0)} 
        />
        <QuickCashGenerator />
        <ProgressMap currentLevel={user?.currentLevel || 'foundation'} />
        <WeeklySummary weeklyIncome={weeklyIncome} />
        <IntegrationPanel />
      </main>

      <Footer />

      {isMobile && <MobileNav />}
    </div>
  );
}


