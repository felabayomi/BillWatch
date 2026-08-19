import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { Button } from "@income/components/ui/button";
import { Input } from "@income/components/ui/input";
import { Label } from "@income/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@income/components/ui/select";
import { useToast } from "@income/hooks/use-toast";
import type { User } from "@income/lib/types";

interface GoalSettingProps {
  user: User;
  onClose?: () => void;
}

export default function GoalSetting({ user, onClose }: GoalSettingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoal || '0');
  const [weeklyGoal, setWeeklyGoal] = useState(user?.weeklyGoal || '0');
  const [monthlyGoal, setMonthlyGoal] = useState(user?.monthlyGoal || '0');
  const [yearlyGoal, setYearlyGoal] = useState(user?.yearlyGoal || '0');
  const [primaryGoalType, setPrimaryGoalType] = useState(user?.primaryGoalType || 'weekly');

  const updateGoalsMutation = useMutation({
    mutationFn: (goals: any) => apiRequest('PATCH', '/api/income-lift/user', goals),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/user'] });
      toast({
        title: "Goals Updated!",
        description: "Your income goals have been saved successfully.",
      });
      onClose?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update your goals. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateGoalsMutation.mutate({
      dailyGoal,
      weeklyGoal,
      monthlyGoal,
      yearlyGoal,
      primaryGoalType,
    });
  };

  const calculateDerivedGoals = (amount: string, type: string) => {
    const value = parseFloat(amount) || 0;
    
    switch (type) {
      case 'daily':
        setDailyGoal(amount);
        setWeeklyGoal((value * 7).toString());
        setMonthlyGoal((value * 30).toString());
        setYearlyGoal((value * 365).toString());
        break;
      case 'weekly':
        setWeeklyGoal(amount);
        setDailyGoal((value / 7).toFixed(2));
        setMonthlyGoal((value * 4.33).toFixed(2));
        setYearlyGoal((value * 52).toString());
        break;
      case 'monthly':
        setMonthlyGoal(amount);
        setDailyGoal((value / 30).toFixed(2));
        setWeeklyGoal((value / 4.33).toFixed(2));
        setYearlyGoal((value * 12).toString());
        break;
      case 'yearly':
        setYearlyGoal(amount);
        setDailyGoal((value / 365).toFixed(2));
        setWeeklyGoal((value / 52).toFixed(2));
        setMonthlyGoal((value / 12).toFixed(2));
        break;
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Define your income targets to track your progress. Set your primary goal and we'll calculate the others automatically.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Primary Goal Type */}
        <div className="space-y-2">
          <Label htmlFor="primaryGoalType">Primary Goal Period</Label>
          <Select value={primaryGoalType} onValueChange={setPrimaryGoalType}>
            <SelectTrigger>
              <SelectValue placeholder="Select your primary goal period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the time period you want to focus on. Other periods will be calculated automatically.
          </p>
        </div>

        {/* Goal Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dailyGoal">Daily Goal</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="dailyGoal"
                type="number"
                step="0.01"
                min="0"
                value={dailyGoal}
                onChange={(e) => {
                  const value = e.target.value;
                  if (primaryGoalType === 'daily') {
                    calculateDerivedGoals(value, 'daily');
                  } else {
                    setDailyGoal(value);
                  }
                }}
                className="pl-8"
                placeholder="0.00"
                data-testid="input-daily-goal"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weeklyGoal">Weekly Goal</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="weeklyGoal"
                type="number"
                step="0.01"
                min="0"
                value={weeklyGoal}
                onChange={(e) => {
                  const value = e.target.value;
                  if (primaryGoalType === 'weekly') {
                    calculateDerivedGoals(value, 'weekly');
                  } else {
                    setWeeklyGoal(value);
                  }
                }}
                className="pl-8"
                placeholder="0.00"
                data-testid="input-weekly-goal"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyGoal">Monthly Goal</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="monthlyGoal"
                type="number"
                step="0.01"
                min="0"
                value={monthlyGoal}
                onChange={(e) => {
                  const value = e.target.value;
                  if (primaryGoalType === 'monthly') {
                    calculateDerivedGoals(value, 'monthly');
                  } else {
                    setMonthlyGoal(value);
                  }
                }}
                className="pl-8"
                placeholder="0.00"
                data-testid="input-monthly-goal"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearlyGoal">Yearly Goal</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="yearlyGoal"
                type="number"
                step="0.01"
                min="0"
                value={yearlyGoal}
                onChange={(e) => {
                  const value = e.target.value;
                  if (primaryGoalType === 'yearly') {
                    calculateDerivedGoals(value, 'yearly');
                  } else {
                    setYearlyGoal(value);
                  }
                }}
                className="pl-8"
                placeholder="0.00"
                data-testid="input-yearly-goal"
              />
            </div>
          </div>
        </div>

        {/* Auto-calculation notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Auto-calculation:</strong> When you update your {primaryGoalType} goal, we'll automatically calculate the other time periods to keep everything aligned.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            type="submit" 
            disabled={updateGoalsMutation.isPending}
            className="flex-1"
            data-testid="button-save-goals"
          >
            {updateGoalsMutation.isPending ? "Saving..." : "Save Goals"}
          </Button>
          {onClose && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-goals"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

