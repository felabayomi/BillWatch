import { Card, CardContent } from "@expense/components/ui/card";
import { Button } from "@expense/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@expense/components/ui/calendar";
import { useExpenseStats, useBudget } from "@expense/hooks/useExpenses";
import { useCurrency } from "@expense/hooks/useCurrency";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@expense/components/ui/dialog";

interface MonthlySummaryProps {
  onDateSelect?: (date: Date | undefined) => void;
}

export function MonthlySummary({ onDateSelect }: MonthlySummaryProps) {
  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState(currentDate);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { formatAmount } = useCurrency();
  
  // If a specific date is selected, use that for stats, otherwise use current month
  const displayMonth = selectedDate ? selectedDate.getMonth() + 1 : currentDate.getMonth() + 1;
  const displayYear = selectedDate ? selectedDate.getFullYear() : currentDate.getFullYear();
  
  const { data: stats, isLoading: statsLoading } = useExpenseStats(displayMonth, displayYear);
  const { data: budgetData, isLoading: budgetLoading } = useBudget(displayMonth, displayYear);
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const monthName = monthNames[displayMonth - 1];
  
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };
  
  const handleTodayClick = () => {
    const today = new Date();
    setSelectedDate(today);
    setCalendarMonth(today);
    onDateSelect?.(today);
    setIsDialogOpen(false);
  };
  
  const handleClearSelection = () => {
    setSelectedDate(undefined);
    setCalendarMonth(currentDate);
    onDateSelect?.(undefined);
    setIsDialogOpen(false);
  };

  // Use custom budget if set, otherwise default to $2000
  const budget = budgetData ? parseFloat(budgetData.amount) : 2000;
  const totalSpent = stats?.total || 0;
  const remaining = budget - totalSpent;
  const budgetProgress = Math.min((totalSpent / budget) * 100, 100);
  const isLoading = statsLoading || budgetLoading;

  return (
    <Card className="mb-6" data-testid="card-monthly-summary">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" data-testid="text-month-year">
            {selectedDate ? (
              <>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </>
            ) : (
              `${monthName} ${displayYear}`
            )}
          </h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                data-testid="button-calendar"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Select Date</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  className="rounded-md border shadow"
                  data-testid="calendar-picker"
                />
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTodayClick}
                    data-testid="button-today"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelection}
                    data-testid="button-clear"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                    data-testid="button-apply-date"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Spent</span>
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Budget</span>
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-muted h-2 rounded-full w-1/3 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Spent</span>
              <span className="text-2xl font-bold" data-testid="text-total-spent">
                {formatAmount(totalSpent)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Budget</span>
              <span className="text-muted-foreground" data-testid="text-budget">
                {formatAmount(budget)}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${budgetProgress}%` }}
                data-testid="progress-budget"
              />
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-remaining">
              {remaining >= 0 
                ? `${formatAmount(remaining)} remaining this month`
                : `${formatAmount(Math.abs(remaining))} over budget`
              }
            </p>
            {selectedDate && (
              <p className="text-xs text-blue-600 dark:text-blue-400" data-testid="text-selected-date-info">
                Showing {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} data
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}