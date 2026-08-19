import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { Card, CardContent } from "@income/components/ui/card";
import { Textarea } from "@income/components/ui/textarea";
import { Button } from "@income/components/ui/button";
import { useToast } from "@income/hooks/use-toast";
import type { IncomeEntry } from "@income/lib/types";

interface WeeklySummaryProps {
  weeklyIncome: IncomeEntry[];
}

const getCalendarDate = (value: string | Date | undefined | null): Date => {
  const rawDate = value ?? new Date();
  const dateOnly = typeof rawDate === "string"
    ? rawDate.slice(0, 10)
    : new Date(rawDate).toISOString().slice(0, 10);

  return new Date(`${dateOnly}T12:00:00`);
};

export default function WeeklySummary({ weeklyIncome }: WeeklySummaryProps) {
  const [reflection, setReflection] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveReflectionMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/income-lift/reflections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/reflections'] });
      toast({
        title: "Reflection saved!",
        description: "Your weekly insights have been recorded.",
      });
      setReflection("");
    },
  });

  const handleSaveReflection = () => {
    if (!reflection.trim()) return;
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    saveReflectionMutation.mutate({
      weekStart: weekStart, // Send as Date object
      reflection,
      strategy: reflection, // Could be separated in a more complex form
    });
  };

  // Calculate daily breakdown
  const dailyBreakdown = weeklyIncome.reduce((acc: Record<string, number>, entry: IncomeEntry) => {
    const rawDate = entry.date || entry.createdAt!;
    const dateOnly = typeof rawDate === "string"
      ? rawDate.slice(0, 10)
      : new Date(rawDate).toISOString().slice(0, 10);
    const calendarDate = new Date(`${dateOnly}T12:00:00`);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = dayNames[calendarDate.getDay()];

    if (!acc[dayName]) {
      acc[dayName] = 0;
    }
    acc[dayName] += parseFloat(entry.amount);
    return acc;
  }, {} as Record<string, number>);

  // Calculate income sources breakdown
  const sourceBreakdown = weeklyIncome.reduce((acc: Record<string, number>, entry: IncomeEntry) => {
    const source = entry.source;
    if (!acc[source]) {
      acc[source] = 0;
    }
    acc[source] += parseFloat(entry.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalWeekly = weeklyIncome.reduce((sum: number, entry: IncomeEntry) => sum + parseFloat(entry.amount), 0);

  // Calculate proper daily average based on actual active income days.
  const daysWithIncome = Object.keys(dailyBreakdown).length;
  const dailyAverage = daysWithIncome > 0 ? totalWeekly / daysWithIncome : 0;
  
  // Calculate previous week comparison by checking if we have income from 7+ days ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // Check if any income entries are from before this week (older than 7 days)
  const hasPreviousWeekData = weeklyIncome.some(entry => {
    const entryDate = getCalendarDate(entry.date || entry.createdAt);
    return entryDate < oneWeekAgo;
  });
  
  // For now, if no previous data exists, show null. When previous data exists, 
  // this should be replaced with a proper API call to get last week's total
  const weekComparison = hasPreviousWeekData ? 0 : null; // Will implement proper calculation later

  const maxDailyAmount = Math.max(...Object.values(dailyBreakdown));

  const sourceColors = {
    wages: 'bg-blue-500',
    side_hustle: 'bg-green-500',
    portfolio: 'bg-purple-500',
    services: 'bg-orange-500',
    other: 'bg-gray-500'
  };

  const sourceLabels = {
    wages: 'Wages',
    side_hustle: 'Side Hustle',
    portfolio: 'Portfolio',
    services: 'Services',
    other: 'Other'
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Summary */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">This Week's Performance</h3>
          
          <div className="space-y-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
              const amount = dailyBreakdown[day] || 0;
              const width = maxDailyAmount > 0 ? (amount / maxDailyAmount) * 100 : 0;
              const isToday = new Date().toLocaleDateString('en', { weekday: 'short' }) === day;
              
              return (
                <div key={day} className="flex items-center justify-between">
                  <span className={`text-sm ${isToday ? 'font-bold' : ''}`}>{day}</span>
                  <div className="flex-1 mx-3 bg-muted rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full progress-bar ${
                        isToday && amount > 0 ? 'bg-green-500' : 'bg-primary'
                      }`}
                      style={{width: `${width}%`}}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium ${isToday && amount > 0 ? 'text-green-600' : ''}`}>
                    {amount > 0 ? `$${amount.toFixed(2)}` : '--'}
                  </span>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Week Total:</span>
              <span className="font-bold" data-testid="text-week-total">${totalWeekly.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Daily Average:</span>
              <span className="font-medium">${dailyAverage.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">vs. Last Week:</span>
              <span className="font-medium text-muted-foreground">
                {weekComparison !== null ? 
                  <span className={weekComparison >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {weekComparison >= 0 ? '+' : ''}${weekComparison.toFixed(2)}
                  </span>
                  : 'No data'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Income Sources Breakdown */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Income Sources This Week</h3>
          
          <div className="space-y-4">
            {Object.entries(sourceBreakdown).map(([source, amount]) => {
              const percentage = totalWeekly > 0 ? (amount / totalWeekly) * 100 : 0;
              return (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 ${sourceColors[source as keyof typeof sourceColors] || 'bg-gray-500'} rounded-full mr-3`}></div>
                    <span className="text-sm">{sourceLabels[source as keyof typeof sourceLabels] || source}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${amount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {totalWeekly > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Winning Strategy</h4>
              <p className="text-sm text-green-700">
                {Object.entries(sourceBreakdown).length > 1 
                  ? "Great diversification! Multiple income sources reduce risk and increase opportunities."
                  : "Consider adding a second income source to increase your financial stability."}
              </p>
            </div>
          )}
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Reflection Prompt</h4>
            <p className="text-sm text-muted-foreground mb-3">What worked best for income this week?</p>
            <Textarea
              className="w-full text-sm"
              rows={3}
              placeholder="Focus on specific actions you can repeat..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              data-testid="textarea-reflection"
            />
            <Button 
              onClick={handleSaveReflection}
              className="mt-3" 
              size="sm"
              disabled={!reflection.trim() || saveReflectionMutation.isPending}
              data-testid="button-save-reflection"
            >
              {saveReflectionMutation.isPending ? "Saving..." : "Save Reflection"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}


