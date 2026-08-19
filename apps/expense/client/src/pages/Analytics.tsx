import { Card, CardContent, CardHeader, CardTitle } from "@expense/components/ui/card";
import { Button } from "@expense/components/ui/button";
import { useExpenseStats, useExpenses } from "@expense/hooks/useExpenses";
import { useCurrency } from "@expense/hooks/useCurrency";
import { EXPENSE_CATEGORIES } from "@expense-shared/schema";
import { BarChart3, PieChart, TrendingUp, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

type ExpenseMonth = { month: number; year: number; count: number };

export default function Analytics() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);
  const { formatAmount } = useCurrency();

  const { data: expenseMonths = [] } = useQuery<ExpenseMonth[]>({
    queryKey: ["/api/expense/expenses/months"],
    queryFn: async () => {
      const response = await fetch("/api/expense/expenses/months", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  useEffect(() => {
    if (!hasAutoNavigated && expenseMonths.length > 0) {
      const currentMonthHasData = expenseMonths.some(
        m => m.month === currentDate.getMonth() + 1 && m.year === currentDate.getFullYear()
      );
      if (!currentMonthHasData) {
        const mostRecent = expenseMonths[0];
        setSelectedMonth(mostRecent.month);
        setSelectedYear(mostRecent.year);
      }
      setHasAutoNavigated(true);
    }
  }, [expenseMonths, hasAutoNavigated]);

  const { data: stats, isLoading } = useExpenseStats(selectedMonth, selectedYear);
  const { data: expenses = [] } = useExpenses({ month: selectedMonth, year: selectedYear });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    const isCurrentMonth = selectedMonth === currentDate.getMonth() + 1 && selectedYear === currentDate.getFullYear();
    if (isCurrentMonth) return;
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const isCurrentMonth = selectedMonth === currentDate.getMonth() + 1 && selectedYear === currentDate.getFullYear();

  const currentMonthHasData = expenseMonths.some(
    m => m.month === selectedMonth && m.year === selectedYear
  );

  const topCategories = stats?.categoryBreakdown 
    ? Object.entries(stats.categoryBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, amount]) => ({
          category,
          amount,
          label: EXPENSE_CATEGORIES[category as keyof typeof EXPENSE_CATEGORIES]?.label || category,
          emoji: EXPENSE_CATEGORIES[category as keyof typeof EXPENSE_CATEGORIES]?.emoji || "📦",
          percentage: (amount / stats.total) * 100
        }))
    : [];

  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Analytics</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-md mx-auto space-y-6">
        <Card data-testid="card-monthly-overview">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{monthNames[selectedMonth - 1]} {selectedYear}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={goToNextMonth} disabled={isCurrentMonth}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-8 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary" data-testid="text-total-amount">
                    {formatAmount(stats?.total || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold" data-testid="text-transaction-count">
                      {expenses.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold" data-testid="text-avg-transaction">
                      {formatAmount(expenses.length > 0 ? (stats?.total || 0) / expenses.length : 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg per Transaction</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-top-categories">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                      <div className="h-4 bg-muted animate-pulse rounded w-20" />
                    </div>
                    <div className="h-4 bg-muted animate-pulse rounded w-16" />
                  </div>
                ))}
              </div>
            ) : topCategories.length > 0 ? (
              <div className="space-y-3">
                {topCategories.map(({ category, amount, label, emoji, percentage }) => (
                  <div key={category} className="flex items-center justify-between" data-testid={`category-${category}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{emoji}</span>
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatAmount(amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4" data-testid="empty-categories">
                No spending data for this month
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-insights">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : expenses.length > 0 ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2" data-testid="insight-most-frequent">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  <p>
                    Your most frequent category is{' '}
                    <span className="font-semibold">
                      {topCategories[0]?.emoji} {topCategories[0]?.label}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2" data-testid="insight-largest">
                  <span className="w-2 h-2 bg-secondary rounded-full"></span>
                  <p>
                    Largest single expense:{' '}
                    <span className="font-semibold">
                      {formatAmount(Math.max(...expenses.map(e => parseFloat(e.amount))))}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2" data-testid="insight-budget">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <p>
                    {(stats?.total || 0) < 2000 
                      ? `You're within budget! ${formatAmount(2000 - (stats?.total || 0))} remaining`
                      : `Over budget by ${formatAmount((stats?.total || 0) - 2000)}`
                    }
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4" data-testid="empty-insights">
                Add some expenses to see insights
              </p>
            )}
          </CardContent>
        </Card>

        {expenseMonths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-5 h-5" />
                Months with Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {expenseMonths.map(({ month, year, count }) => (
                  <Button
                    key={`${month}-${year}`}
                    variant={month === selectedMonth && year === selectedYear ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => { setSelectedMonth(month); setSelectedYear(year); }}
                  >
                    {monthNames[month - 1].slice(0, 3)} {year} ({count})
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
