import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";
import { Calendar as CalendarIcon, DollarSign, FileText, Filter, ArrowLeft, ChartLine } from "lucide-react";
import { format } from "date-fns";
import type { IncomeEntry } from "@income-shared/schema";

const getCalendarDate = (value: string | Date | null | undefined): Date => {
  const rawDate = value ?? new Date();
  const dateOnly = typeof rawDate === "string"
    ? rawDate.slice(0, 10)
    : new Date(rawDate).toISOString().slice(0, 10);

  return new Date(`${dateOnly}T12:00:00`);
};

export default function IncomeHistoryPage() {
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'thisMonth' | 'lastMonth' | 'custom'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch all income entries
  const { data: allEntries = [], isLoading } = useQuery<IncomeEntry[]>({
    queryKey: ['/api/income-lift/income/all'],
  });

  // Filter entries based on selected date range
  const getFilteredEntries = () => {
    if (dateFilter === 'all') return allEntries;

    if (dateFilter === 'custom' && selectedDate) {
      // Filter by exact date
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      return allEntries.filter(entry => {
        if (!entry.date) return false;
        const entryDateStr = format(getCalendarDate(entry.date), 'yyyy-MM-dd');
        return entryDateStr === selectedDateStr;
      });
    }

    const now = new Date();
    const startDate = new Date();
    let endDate = new Date();

    if (dateFilter === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateFilter === 'month') {
      startDate.setDate(now.getDate() - 30);
    } else if (dateFilter === 'thisMonth') {
      // First day of current month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'lastMonth') {
      // First day of last month
      startDate.setMonth(now.getMonth() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      // Last day of last month
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
    }

    return allEntries.filter(entry => {
      if (!entry.date) return false;
      const entryDate = getCalendarDate(entry.date);

      if (dateFilter === 'lastMonth') {
        return entryDate >= startDate && entryDate <= endDate;
      }

      return entryDate >= startDate;
    });
  };

  const filteredEntries = getFilteredEntries();

  // Sort by date (newest first)
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const dateA = a.date ? getCalendarDate(a.date).getTime() : 0;
    const dateB = b.date ? getCalendarDate(b.date).getTime() : 0;
    return dateB - dateA;
  });

  // Calculate totals
  const totalAmount = filteredEntries.reduce((sum, entry) => 
    sum + parseFloat(entry.amount), 0
  );

  // Group entries by date
  const groupedByDate = sortedEntries.reduce((groups, entry) => {
    if (!entry.date) return groups;
    const dateKey = format(getCalendarDate(entry.date), 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(entry);
    return groups;
  }, {} as Record<string, IncomeEntry[]>);

  // Calculate monthly totals from all entries
  const monthlyTotals = allEntries.reduce((totals, entry) => {
    if (!entry.date) return totals;
    const monthKey = format(getCalendarDate(entry.date), 'yyyy-MM'); // e.g., "2025-10"
    if (!totals[monthKey]) {
      totals[monthKey] = 0;
    }
    totals[monthKey] += parseFloat(entry.amount);
    return totals;
  }, {} as Record<string, number>);

  // Sort monthly totals by month (newest first)
  const sortedMonthlyTotals = Object.entries(monthlyTotals)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6); // Show last 6 months

  const sourceLabels: Record<string, string> = {
    wages: 'Wages',
    side_hustle: 'Side Hustle',
    portfolio: 'Portfolio',
    services: 'Services',
    other: 'Other'
  };

  const sourceColors: Record<string, string> = {
    wages: 'bg-blue-500',
    side_hustle: 'bg-purple-500',
    portfolio: 'bg-green-500',
    services: 'bg-orange-500',
    other: 'bg-gray-500'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <a
            href="/income"
            data-testid="button-back-home"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </a>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Income History</h1>
          <p className="text-muted-foreground">View all your daily income records and entries</p>
        </div>

          {/* Filters and Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Filter Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Filter className="mr-2 text-primary" size={20} />
                  <h3 className="font-semibold">Filter by Date</h3>
                </div>
                <div className="space-y-4">
                  <select
                    value={dateFilter === 'custom' ? '' : dateFilter}
                    onChange={(e) => {
                      const value = e.target.value as 'all' | 'week' | 'month' | 'thisMonth' | 'lastMonth';
                      setDateFilter(value);
                      setSelectedDate(undefined);
                    }}
                    className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    data-testid="select-filter"
                  >
                    <option value="all">All Time</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    {dateFilter === 'custom' && selectedDate && (
                      <option value="" disabled>
                        Custom: {format(selectedDate, "MMM d, yyyy")}
                      </option>
                    )}
                  </select>
                  
                  <div className="relative">
                    <div className="text-sm text-muted-foreground mb-2">Or pick a specific date:</div>
                    <input
                      type="date"
                      value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(new Date(e.target.value));
                          setDateFilter('custom');
                        } else {
                          setSelectedDate(undefined);
                          setDateFilter('all');
                        }
                      }}
                      className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      data-testid="input-date-picker"
                    />
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(undefined);
                          setDateFilter('all');
                        }}
                        className="w-full mt-2 h-9 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        data-testid="button-clear-date"
                      >
                        Clear custom date
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center mb-2">
                      <DollarSign className="mr-2 text-green-600" size={20} />
                      <h3 className="font-semibold">Total Earned</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-600" data-testid="text-total-earned">
                      ${totalAmount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dateFilter === 'all' 
                        ? 'All time' 
                        : dateFilter === 'week' 
                        ? 'Last 7 days' 
                        : dateFilter === 'month'
                        ? 'Last 30 days'
                        : dateFilter === 'thisMonth'
                        ? 'This month'
                        : dateFilter === 'lastMonth'
                        ? 'Last month'
                        : selectedDate
                        ? format(selectedDate, 'MMM d, yyyy')
                        : 'Custom date'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center mb-2">
                      <FileText className="mr-2 text-blue-600" size={20} />
                      <h3 className="font-semibold">Total Entries</h3>
                    </div>
                    <p className="text-3xl font-bold text-blue-600" data-testid="text-total-entries">
                      {filteredEntries.length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filteredEntries.length === 1 ? 'income record' : 'income records'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Totals Section */}
          {sortedMonthlyTotals.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <ChartLine className="mr-2 text-primary" size={20} />
                  Monthly Totals
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {sortedMonthlyTotals.map(([monthKey, total]) => (
                    <div 
                      key={monthKey}
                      className="text-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => {
                        const [year, month] = monthKey.split('-');
                        const targetMonth = parseInt(month) - 1;
                        const now = new Date();
                        const currentMonth = now.getMonth();
                        const currentYear = now.getFullYear();
                        
                        if (parseInt(year) === currentYear && targetMonth === currentMonth) {
                          setDateFilter('thisMonth');
                        } else if (parseInt(year) === currentYear && targetMonth === currentMonth - 1) {
                          setDateFilter('lastMonth');
                        }
                        setSelectedDate(undefined);
                      }}
                      data-testid={`month-total-${monthKey}`}
                    >
                      <div className="text-sm text-muted-foreground mb-1">
                        {format(new Date(monthKey + '-01'), 'MMM yyyy')}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        ${total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Income Entries List */}
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your income history...</p>
              </CardContent>
            </Card>
          ) : sortedEntries.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarIcon className="mx-auto mb-4 text-muted-foreground" size={48} />
                <h3 className="text-xl font-semibold mb-2">No Income Entries Yet</h3>
                <p className="text-muted-foreground">
                  {dateFilter === 'all' 
                    ? "Start tracking your income to see your history here."
                    : "No income entries found for this time period. Try a different filter."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([dateKey, entries]) => {
                const dailyTotal = entries.reduce((sum, entry) => 
                  sum + parseFloat(entry.amount), 0
                );

                return (
                  <div key={dateKey}>
                    {/* Date Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 text-primary" size={18} />
                        <h3 className="text-lg font-semibold">
                          {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                        </h3>
                      </div>
                      <div className="text-lg font-bold text-green-600" data-testid={`text-daily-total-${dateKey}`}>
                        ${dailyTotal.toFixed(2)}
                      </div>
                    </div>

                    {/* Entries for this date */}
                    <div className="space-y-3">
                      {entries.map((entry) => (
                        <Card key={entry.id} data-testid={`card-entry-${entry.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <div className={`w-3 h-3 ${sourceColors[entry.source] || 'bg-gray-500'} rounded-full mr-3`}></div>
                                  <span className="font-semibold text-lg">
                                    {sourceLabels[entry.source] || entry.source}
                                  </span>
                                </div>
                                {entry.notes && (
                                  <p className="text-sm text-muted-foreground ml-6" data-testid={`text-notes-${entry.id}`}>
                                    {entry.notes}
                                  </p>
                                )}
                                {entry.date && (
                                  <p className="text-xs text-muted-foreground ml-6 mt-1">
                                    {format(new Date(entry.date), 'h:mm a')}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600" data-testid={`text-amount-${entry.id}`}>
                                  ${parseFloat(entry.amount).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}




