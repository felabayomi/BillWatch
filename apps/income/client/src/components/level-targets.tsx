import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { Button } from "@income/components/ui/button";
import { Input } from "@income/components/ui/input";
import { Label } from "@income/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import { useToast } from "@income/hooks/use-toast";
import type { User } from "@income/lib/types";

interface LevelTargetsProps {
  user: User;
  onClose?: () => void;
}

export default function LevelTargets({ user, onClose }: LevelTargetsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [targets, setTargets] = useState({
    foundation: user?.levelTargets?.foundation?.amount || '',
    stability: user?.levelTargets?.stability?.amount || '',
    growth: user?.levelTargets?.growth?.amount || '',
    legacy: user?.levelTargets?.legacy?.amount || '',
  });

  const updateTargetsMutation = useMutation({
    mutationFn: (levelTargets: any) => apiRequest('PATCH', '/api/income-lift/user', { levelTargets }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/user'] });
      toast({
        title: "Level Targets Set!",
        description: "Your income targets have been saved successfully.",
      });
      onClose?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update your level targets. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const levelTargets = {
      foundation: (targets.foundation && parseFloat(targets.foundation.toString()) > 0) ? { amount: parseFloat(targets.foundation.toString()), currency: "USD" } : undefined,
      stability: (targets.stability && parseFloat(targets.stability.toString()) > 0) ? { amount: parseFloat(targets.stability.toString()), currency: "USD" } : undefined,
      growth: (targets.growth && parseFloat(targets.growth.toString()) > 0) ? { amount: parseFloat(targets.growth.toString()), currency: "USD" } : undefined,
      legacy: (targets.legacy && parseFloat(targets.legacy.toString()) > 0) ? { amount: parseFloat(targets.legacy.toString()), currency: "USD" } : undefined,
    };

    updateTargetsMutation.mutate(levelTargets);
  };

  const handleTargetChange = (level: string, value: string) => {
    // Always store the raw string value to allow proper typing
    setTargets(prev => ({ ...prev, [level]: value }));
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Set Your Level Targets</h3>
        <p className="text-sm text-muted-foreground">
          Set {user?.primaryGoalType || 'weekly'} income targets for each level. Move forward when you hit your number—no deadlines, just progress.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Current timeframe:</strong> {user?.primaryGoalType || 'weekly'} goals
            {!user?.primaryGoalType && (
              <span className="text-blue-600 ml-2">(Set your goal timeframe in "Set Income Goals" first)</span>
            )}
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Foundation</CardTitle>
              <p className="text-sm text-muted-foreground">
                {user?.primaryGoalType || 'Weekly'} income target to reach before moving to Stability.
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={targets.foundation}
                  onChange={(e) => handleTargetChange('foundation', e.target.value)}
                  className="pl-8"
                  placeholder="300"
                  data-testid="input-foundation-target"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stability</CardTitle>
              <p className="text-sm text-muted-foreground">
                {user?.primaryGoalType || 'Weekly'} income target to reach before you move to Growth.
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={targets.stability}
                  onChange={(e) => handleTargetChange('stability', e.target.value)}
                  className="pl-8"
                  placeholder="900"
                  data-testid="input-stability-target"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Growth</CardTitle>
              <p className="text-sm text-muted-foreground">
                {user?.primaryGoalType || 'Weekly'} income target to reach before you move to Legacy.
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={targets.growth}
                  onChange={(e) => handleTargetChange('growth', e.target.value)}
                  className="pl-8"
                  placeholder="1500"
                  data-testid="input-growth-target"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Legacy</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your {user?.primaryGoalType || 'weekly'} income milestone. Celebrate big when you get here.
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={targets.legacy}
                  onChange={(e) => handleTargetChange('legacy', e.target.value)}
                  className="pl-8"
                  placeholder="5000"
                  data-testid="input-legacy-target"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> When your {user?.primaryGoalType || 'weekly'} income hits your target, you advance to the next level automatically. Your timeframe resets with each new level.
          </p>
        </div>

        <div className="flex gap-3">
          <Button 
            type="submit" 
            disabled={updateTargetsMutation.isPending}
            className="flex-1"
            data-testid="button-save-level-targets"
          >
            {updateTargetsMutation.isPending ? "Saving..." : "Save Level Targets"}
          </Button>
          {onClose && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-level-targets"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

