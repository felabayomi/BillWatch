import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DailyCashFlow {
  date: string;
  totalIncome: number;
  totalExpenses: number;
  totalBillsPaid: number;
  netCashFlow: number;
}

interface CashFlowTransaction {
  id: string;
  txDate: string;
  amountCents: number;
  description: string;
  accountId: string;
  accountName: string;
  categoryName: string;
  categoryKind: string;
}

function getWeekDates(date: Date) {
  const day = date.getDay();
  const diff = date.getDate() - day;
  const weekStart = new Date(date);
  weekStart.setDate(diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { start: weekStart, end: weekEnd };
}

function formatWeekRange(start: Date, end: Date) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

function TransactionList({ startDate, endDate, type, label }: { startDate: string; endDate: string; type: string; label: string }) {
  const { data: transactions = [], isLoading } = useQuery<CashFlowTransaction[]>({
    queryKey: ['/api/cash-flow/transactions', startDate, endDate, type],
    queryFn: async () => {
      const response = await fetch(`/api/cash-flow/transactions?start=${startDate}&end=${endDate}&type=${type}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-2 pl-4">Loading...</div>;
  }

  if (transactions.length === 0) {
    return <div className="text-xs text-muted-foreground py-2 pl-4">No {label.toLowerCase()} transactions found</div>;
  }

  return (
    <div className="space-y-1 py-2 pl-4 border-l-2 border-muted ml-2">
      {transactions.map((tx) => (
        <div key={tx.id} className="flex items-start justify-between text-xs gap-2 py-1">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{tx.description || 'No description'}</p>
            <p className="text-muted-foreground truncate">
              {tx.accountName}{tx.categoryName ? ` · ${tx.categoryName}` : ''}
              {startDate !== endDate && ` · ${tx.txDate}`}
            </p>
          </div>
          <span className={`flex-shrink-0 font-mono ${tx.amountCents >= 0 ? 'text-secondary' : 'text-destructive'}`}>
            {tx.amountCents >= 0 ? '' : '-'}{formatCurrency(Math.abs(tx.amountCents))}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClickableRow({ label, amount, colorClass, prefix, startDate, endDate, type }: {
  label: string;
  amount: number;
  colorClass: string;
  prefix?: string;
  startDate: string;
  endDate: string;
  type: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (amount === 0) {
    return (
      <div className="flex justify-between">
        <span>{label}:</span>
        <span className={colorClass}>{prefix || ''}{formatCurrency(amount)}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex justify-between items-center w-full text-left hover:bg-muted/50 rounded px-1 -mx-1 py-0.5 transition-colors"
      >
        <span className="flex items-center gap-1">
          {label}:
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </span>
        <span className={colorClass}>{prefix || ''}{formatCurrency(amount)}</span>
      </button>
      {expanded && (
        <TransactionList startDate={startDate} endDate={endDate} type={type} label={label} />
      )}
    </div>
  );
}

export default function CashFlow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toLocaleDateString('en-CA'));
  const [selectedWeekDate, setSelectedWeekDate] = useState(today.toLocaleDateString('en-CA'));
  const [selectedMonth, setSelectedMonth] = useState(today.toLocaleDateString('en-CA').substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { start: weekStart, end: weekEnd } = getWeekDates(new Date(selectedWeekDate));
  const weekStartStr = weekStart.toLocaleDateString('en-CA');
  const weekEndStr = weekEnd.toLocaleDateString('en-CA');

  const { data: dailyData } = useQuery({
    queryKey: ['/api/cash-flow', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/cash-flow?date=${selectedDate}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch cash flow data');
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { data: weeklyData = [] } = useQuery<DailyCashFlow[]>({
    queryKey: ['/api/cash-flow/weekly', weekStartStr, weekEndStr],
    queryFn: async () => {
      const response = await fetch(`/api/cash-flow/weekly?start=${weekStartStr}&end=${weekEndStr}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: monthlyData = [] } = useQuery<DailyCashFlow[]>({
    queryKey: ['/api/cash-flow/monthly', selectedMonth],
    queryFn: async () => {
      const response = await fetch(`/api/cash-flow/monthly?month=${selectedMonth}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: yearlyData = [] } = useQuery<DailyCashFlow[]>({
    queryKey: ['/api/cash-flow/yearly', selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/cash-flow/yearly?year=${selectedYear}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const weeklyTotals = weeklyData.reduce(
    (acc, day) => ({
      income: acc.income + day.totalIncome,
      expenses: acc.expenses + day.totalExpenses,
      bills: acc.bills + day.totalBillsPaid,
      net: acc.net + day.netCashFlow,
    }),
    { income: 0, expenses: 0, bills: 0, net: 0 }
  );

  const monthlyTotals = monthlyData.reduce(
    (acc, day) => ({
      income: acc.income + day.totalIncome,
      expenses: acc.expenses + day.totalExpenses,
      bills: acc.bills + day.totalBillsPaid,
      net: acc.net + day.netCashFlow,
    }),
    { income: 0, expenses: 0, bills: 0, net: 0 }
  );

  const yearlyTotals = yearlyData.reduce(
    (acc, day) => ({
      income: acc.income + day.totalIncome,
      expenses: acc.expenses + day.totalExpenses,
      bills: acc.bills + day.totalBillsPaid,
      net: acc.net + day.netCashFlow,
    }),
    { income: 0, expenses: 0, bills: 0, net: 0 }
  );

  const navigateWeek = (direction: number) => {
    const current = new Date(selectedWeekDate);
    current.setDate(current.getDate() + (direction * 7));
    setSelectedWeekDate(current.toLocaleDateString('en-CA'));
  };

  const navigateMonth = (direction: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + direction, 1);
    setSelectedMonth(newDate.toLocaleDateString('en-CA').substring(0, 7));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const formatSelectedDate = () => {
    const [year, month, day] = selectedDate.split('-');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return `${dayNames[date.getDay()]}, ${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  };

  const formatSelectedMonth = () => {
    const [year, month] = selectedMonth.split('-');
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const years = Array.from({ length: 10 }, (_, i) => (today.getFullYear() - 5 + i).toString());

  const monthStartDate = `${selectedMonth}-01`;
  const monthEndDate = (() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
  })();

  const yearStartDate = `${selectedYear}-01-01`;
  const yearEndDate = `${selectedYear}-12-31`;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
      toast({ title: "Refreshed", description: "Cash flow data updated with latest transactions." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to refresh data.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Cash Flow</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Daily Summary</CardTitle>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
                data-testid="input-date"
              />
            </div>
            <p className="text-sm text-muted-foreground">{formatSelectedDate()}</p>
          </CardHeader>
          <CardContent>
            {dailyData ? (
              <div className="space-y-2">
                <ClickableRow label="Income" amount={dailyData.totalIncome} colorClass="text-secondary" startDate={selectedDate} endDate={selectedDate} type="income" />
                <ClickableRow label="Expenses" amount={dailyData.totalExpenses} colorClass="text-destructive" prefix="-" startDate={selectedDate} endDate={selectedDate} type="expenses" />
                <ClickableRow label="Bills" amount={dailyData.totalBillsPaid} colorClass="text-destructive" prefix="-" startDate={selectedDate} endDate={selectedDate} type="bills" />
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Net:</span>
                  <span className={dailyData.netCashFlow >= 0 ? 'text-secondary' : 'text-destructive'}>
                    {formatCurrency(dailyData.netCashFlow)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No data for this date</p>
            )}
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Weekly Summary</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{formatWeekRange(weekStart, weekEnd)}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <ClickableRow label="Income" amount={weeklyTotals.income} colorClass="text-secondary" startDate={weekStartStr} endDate={weekEndStr} type="income" />
              <ClickableRow label="Expenses" amount={weeklyTotals.expenses} colorClass="text-destructive" prefix="-" startDate={weekStartStr} endDate={weekEndStr} type="expenses" />
              <ClickableRow label="Bills" amount={weeklyTotals.bills} colorClass="text-destructive" prefix="-" startDate={weekStartStr} endDate={weekEndStr} type="bills" />
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Net:</span>
                <span className={weeklyTotals.net >= 0 ? 'text-secondary' : 'text-destructive'}>
                  {formatCurrency(weeklyTotals.net)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                {weeklyData.length} days recorded
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Monthly Summary</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{formatSelectedMonth()}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <ClickableRow label="Income" amount={monthlyTotals.income} colorClass="text-secondary" startDate={monthStartDate} endDate={monthEndDate} type="income" />
              <ClickableRow label="Expenses" amount={monthlyTotals.expenses} colorClass="text-destructive" prefix="-" startDate={monthStartDate} endDate={monthEndDate} type="expenses" />
              <ClickableRow label="Bills" amount={monthlyTotals.bills} colorClass="text-destructive" prefix="-" startDate={monthStartDate} endDate={monthEndDate} type="bills" />
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Net:</span>
                <span className={monthlyTotals.net >= 0 ? 'text-secondary' : 'text-destructive'}>
                  {formatCurrency(monthlyTotals.net)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                {monthlyData.length} days recorded
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Yearly Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Yearly Summary</CardTitle>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">{selectedYear}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <ClickableRow label="Income" amount={yearlyTotals.income} colorClass="text-secondary" startDate={yearStartDate} endDate={yearEndDate} type="income" />
              <ClickableRow label="Expenses" amount={yearlyTotals.expenses} colorClass="text-destructive" prefix="-" startDate={yearStartDate} endDate={yearEndDate} type="expenses" />
              <ClickableRow label="Bills" amount={yearlyTotals.bills} colorClass="text-destructive" prefix="-" startDate={yearStartDate} endDate={yearEndDate} type="bills" />
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Net:</span>
                <span className={yearlyTotals.net >= 0 ? 'text-secondary' : 'text-destructive'}>
                  {formatCurrency(yearlyTotals.net)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                {yearlyData.length} days recorded
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
