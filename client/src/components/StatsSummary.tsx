import { format } from "date-fns";

interface StatsSummaryProps {
  stats: {
    thisMonth: number;
    upcoming: number;
    overdue: number;
    paid: number;
    paidThisMonth: number;
    remainingThisMonth: number;
    nextDueDate: string | null;
    nextDueBill: string | null;
    cumulativeTotal: number;
    cumulativePaid: number;
    cumulativeUnpaid: number;
    allTimeTotal: number;
    allTimePaid: number;
    allTimeUnpaid: number;
  };
  selectedMonth: string;
  onOverdueClick?: () => void;
}

export function StatsSummary({ stats, selectedMonth, onOverdueClick }: StatsSummaryProps) {
  const formatNextDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'MMM dd');
    } catch {
      return null;
    }
  };

  const nextDueDateFormatted = formatNextDueDate(stats.nextDueDate);

  return (
    <div className="bg-gradient-to-r from-primary to-blue-600" data-testid="stats-summary">
      <div className="p-4 space-y-4">
        {/* This Month - Main Card */}
        <div className="bg-white rounded-xl shadow-lg p-5">
          <div className="text-center">
            <div 
              className="text-gray-900 text-3xl font-bold mb-2"
              data-testid="stat-this-month"
            >
              ${stats.thisMonth.toFixed(2)}
            </div>
            <div className="text-gray-600 text-sm font-medium mb-3">This Month</div>
            <div className="flex justify-center items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">Paid: ${stats.paidThisMonth.toFixed(2)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                <span className="text-gray-700 font-medium">Left: ${stats.remainingThisMonth.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Totals Section */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left Column - Cumulative Total Through Selected Month */}
          <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-blue-100">
            <div className="text-center">
              <div className="text-gray-900 text-lg font-bold mb-2">
                ${(stats.cumulativeTotal || 0).toFixed(2)}
              </div>
              <div className="text-gray-600 text-xs font-medium mb-3">Total Through {selectedMonth}</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Paid: ${(stats.cumulativePaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Unpaid: ${(stats.cumulativeUnpaid || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - All Time Total (Never Changes) */}
          <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-gray-100">
            <div className="text-center">
              <div className="text-gray-900 text-lg font-bold mb-2">
                ${(stats.allTimeTotal || 0).toFixed(2)}
              </div>
              <div className="text-gray-600 text-xs font-medium mb-3">All Time Total</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Paid: ${(stats.allTimePaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Unpaid: ${(stats.allTimeUnpaid || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming & Overdue Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="text-center">
              <div 
                className="text-gray-900 text-xl font-bold flex items-center justify-center space-x-2 mb-1"
                data-testid="stat-upcoming"
              >
                <span>📅</span>
                <span>{(stats as any).upcomingCount || 0}</span>
              </div>
              <div className="text-gray-600 text-sm font-medium mb-2">Upcoming</div>
              {nextDueDateFormatted && stats.nextDueBill && (
                <div className="text-gray-500 text-xs leading-relaxed">
                  Next: <span className="font-medium text-gray-700">{stats.nextDueBill}</span>
                  <br />
                  <span className="font-medium text-blue-600">{nextDueDateFormatted}</span>
                </div>
              )}
            </div>
          </div>

          <div 
            className={`bg-white rounded-xl shadow-lg p-4 ${stats.overdue > 0 && onOverdueClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
            onClick={stats.overdue > 0 && onOverdueClick ? onOverdueClick : undefined}
          >
            <div className="text-center">
              <div 
                className="text-gray-900 text-xl font-bold flex items-center justify-center space-x-2 mb-1"
                data-testid="stat-overdue"
              >
                {stats.overdue === 0 ? (
                  <>
                    <span>🎉</span>
                    <span>${stats.overdue.toFixed(2)}</span>
                  </>
                ) : (
                  <>
                    <span>⚠️</span>
                    <span className="text-red-600">${stats.overdue.toFixed(2)}</span>
                  </>
                )}
              </div>
              <div className="text-gray-600 text-sm font-medium mb-2">Overdue</div>
              {stats.overdue === 0 ? (
                <div className="text-green-600 text-sm font-semibold">
                  All clear!
                </div>
              ) : (
                <div className="text-red-600 text-sm font-semibold">
                  Needs attention
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
