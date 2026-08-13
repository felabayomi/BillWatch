import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Home, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, differenceInDays } from "date-fns";
import { useBills } from "@/hooks/useBills";
import { Bill } from "@shared/schema";
import { useLocation } from "wouter";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: bills = [] } = useBills();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get bills for a specific date
  const getBillsForDate = (date: Date): Bill[] => {
    return bills.filter(bill => 
      isSameDay(new Date(bill.dueDate), date) && bill.status !== "paid"
    );
  };

  // Get ALL bills for a specific date (including paid ones)
  const getAllBillsForDate = (date: Date): Bill[] => {
    return bills.filter(bill => 
      isSameDay(new Date(bill.dueDate), date)
    );
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    const dateBills = getAllBillsForDate(date);
    if (dateBills.length > 0) {
      setSelectedDate(date);
      setShowDateModal(true);
    }
  };

  // Get urgency level for bill color coding (same as home page)
  const getUrgencyClass = (bill: Bill) => {
    if (bill.status === "paid") return "bg-green-100 text-green-700";
    
    const dueDate = new Date(bill.dueDate);
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "bg-red-100 text-red-700"; // Red - overdue
    if (diffDays <= 4) return "bg-yellow-100 text-yellow-700"; // Yellow - 4 days or less 
    if (diffDays <= 7) return "bg-amber-100 text-amber-700"; // Amber - within a week
    return "bg-blue-100 text-blue-700"; // Default blue
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };

  // Go back to home
  const goToHome = () => {
    setLocation("/");
  };

  return (
    <Layout>
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToHome}
              className="p-2"
              data-testid="button-back-home"
            >
              <Home className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Calendar View</h1>
              <p className="text-xs text-muted-foreground">
                {format(currentDate, "MMMM yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="p-2"
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="p-2"
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map(day => {
            const dayBills = getBillsForDate(day);
            const isCurrentDay = isToday(day);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toISOString()}
                className={`
                  min-h-[80px] p-1 border border-border rounded-lg cursor-pointer transition-colors
                  ${isCurrentDay ? "bg-primary/10 border-primary" : "bg-card"}
                  ${!isCurrentMonth ? "opacity-50" : ""}
                  ${dayBills.length > 0 ? "hover:bg-primary/5" : ""}
                `}
                onClick={() => handleDateClick(day)}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
              >
                <div
                  className={`
                    text-xs font-medium mb-1
                    ${isCurrentDay ? "text-primary" : "text-foreground"}
                  `}
                >
                  {format(day, "d")}
                </div>
                
                <div className="space-y-1">
                  {dayBills.slice(0, 2).map(bill => (
                    <div
                      key={bill.id}
                      className={`
                        text-xs p-1 rounded truncate font-medium
                        ${getUrgencyClass(bill)}
                      `}
                      title={`${bill.company} - $${parseFloat(bill.amount.toString()).toFixed(2)}`}
                      data-testid={`calendar-bill-${bill.id}`}
                    >
                      ${parseFloat(bill.amount.toString()).toFixed(2)}
                    </div>
                  ))}
                  {dayBills.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayBills.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border">
        <h3 className="text-sm font-medium mb-2">Bill Urgency Legend</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span>Overdue</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Due ≤4 days</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
            <span>Due ≤7 days</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Upcoming</span>
          </div>
        </div>
      </div>

      {/* Date Bills Modal */}
      <Dialog open={showDateModal} onOpenChange={setShowDateModal}>
        <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Bills for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDateModal(false)}
                data-testid="close-date-modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {selectedDate && getAllBillsForDate(selectedDate).map(bill => (
              <div 
                key={bill.id}
                className={`
                  p-3 rounded-lg border-l-4
                  ${bill.status === "paid" 
                    ? "border-l-green-500 bg-green-50" 
                    : bill.status === "overdue" 
                    ? "border-l-red-500 bg-red-50"
                    : "border-l-blue-500 bg-blue-50"
                  }
                `}
                data-testid={`modal-bill-${bill.id}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-sm">{bill.company}</h4>
                    {bill.accountNumber && (
                      <p className="text-xs text-muted-foreground">
                        Account: {bill.accountNumber}
                      </p>
                    )}
                    {bill.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {bill.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${parseFloat(bill.amount.toString()).toFixed(2)}</div>
                    <div className={`
                      text-xs px-2 py-1 rounded-full mt-1
                      ${bill.status === "paid" 
                        ? "bg-green-100 text-green-700" 
                        : bill.status === "overdue"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                      }
                    `}>
                      {bill.status === "paid" ? "Paid" : 
                       bill.status === "overdue" ? "Overdue" : "Due"}
                    </div>
                  </div>
                </div>
                
                {bill.category && (
                  <div className="mt-2 text-xs">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {bill.category}
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {selectedDate && getAllBillsForDate(selectedDate).length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                No bills due on this date
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
