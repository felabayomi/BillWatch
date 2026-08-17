import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { StatsSummary } from "@/components/StatsSummary";
import { BillCard } from "@/components/BillCard";
import { ScanModal } from "@/components/ScanModal";
import { AddBillModal } from "@/components/AddBillModal";
import { ReminderModal, type ReminderPreferences } from "@/components/ReminderModal";
import { PaymentModal } from "@/components/PaymentModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Receipt, Camera, Plus, Settings, LogOut, ChevronDown, ChevronUp, Search, Send, Loader2, CalendarIcon, X, CheckSquare, Square, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBills, useBillStats, useUpdateBill, useDeleteBill, useDuplicateBill, useCarryoverBills } from "@/hooks/useBills";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, subMonths } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useClerk } from "@clerk/clerk-react";

type FilterType = "all" | "paid";

export default function Home() {
  const { openSignIn, signOut } = useClerk();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const overdueRef = useRef<HTMLDivElement>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [paymentFlow, setPaymentFlow] = useState<"record" | "pay_now">("record");
  const [retryingPayments, setRetryingPayments] = useState<Set<string>>(new Set());
  const [overdueSelectMode, setOverdueSelectMode] = useState(false);
  const [selectedOverdueIds, setSelectedOverdueIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: allBills = [] } = useBills();
  const { data: bills = [], isLoading: billsLoading, error: billsError } = useBills(selectedDate);
  const { data: stats, isLoading: statsLoading, error: statsError } = useBillStats(selectedDate);
  const { data: carryoverBills = [], isLoading: carryoverLoading } = useCarryoverBills(selectedDate);
  const updateBillMutation = useUpdateBill();
  const deleteBillMutation = useDeleteBill();
  const duplicateBillMutation = useDuplicateBill();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check for unauthorized errors and redirect to login
  useEffect(() => {
    const errors = [billsError, statsError].filter(Boolean);
    const hasUnauthorizedError = errors.some(error => isUnauthorizedError(error as Error));
    
    if (hasUnauthorizedError) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        openSignIn({ redirectUrl: "/" });
      }, 500);
    }
  }, [billsError, statsError, toast, openSignIn]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keep the selected month under the user's control so they can browse past and future months normally.
  // Do not auto-jump months based on bill dates; this blocks month navigation and makes the calendar feel broken.

  // Filter bills based on active filter and search query
  const filteredBills = bills.filter(bill => {
    let statusMatch = false;
    if (activeFilter === "all") {
      statusMatch = bill.status !== "paid";
    } else if (activeFilter === "paid") {
      statusMatch = bill.status === "paid";
    } else {
      statusMatch = true;
    }
    
    const searchMatch = searchQuery.trim() === "" || 
      bill.company.toLowerCase().includes(searchQuery.toLowerCase());
    
    let dateMatch = true;
    if (searchDate) {
      const billDueDate = bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : '';
      dateMatch = billDueDate === searchDate;
    }
    
    return statusMatch && searchMatch && dateMatch;
  }).sort((a, b) => {
    if (activeFilter === "paid") {
      const aPaid = a.paidDate ? new Date(a.paidDate).getTime() : 0;
      const bPaid = b.paidDate ? new Date(b.paidDate).getTime() : 0;
      return bPaid - aPaid;
    }
    return 0;
  });

  // Get urgency level for bill color coding
  const getUrgencyLevel = (bill: any) => {
    if (bill.status === "paid") return "paid";
    
    const dueDate = new Date(bill.dueDate);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "overdue"; // Red - overdue
    if (diffDays <= 4) return "critical"; // Yellow - 4 days or less 
    if (diffDays <= 7) return "warning"; // Amber - within a week
    return "normal"; // Default color
  };

  const handleMarkAsPaid = (billId: string) => {
    // Open payment modal instead of directly marking as paid
    setSelectedBillId(billId);
    setPaymentFlow("record");
    setShowPaymentModal(true);
  };

  const handleSetReminder = (billId: string) => {
    setSelectedBillId(billId);
    setShowReminderModal(true);
  };

  const handlePayNow = (billId: string) => {
    // Navigate directly to BILL.com payment page
    const bill = bills?.find((b: any) => b.id === billId);
    if (bill) {
      const paymentUrl = `/payment?billId=${billId}&amount=${bill.amount}&company=${encodeURIComponent(bill.company)}&accountNumber=${encodeURIComponent(bill.accountNumber || '')}`;
      setLocation(paymentUrl);
    }
  };

  const handleSnooze = (billId: string) => {
    // Snooze for 1 day
    toast({
      title: "Reminder snoozed",
      description: "Reminders have been snoozed for 1 day.",
    });
  };

  const handleSendCheck = async (billId: string) => {
    try {
      const response = await fetch("/api/billcom/trigger-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ billId }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Check Sent!",
          description: result.message || "Your payment is being processed and will be mailed to the creditor.",
        });
        // Refresh bills to show updated status
        window.location.reload();
      } else {
        throw new Error(result.error || "Failed to send check");
      }
    } catch (error: any) {
      toast({
        title: "Error Sending Check",
        description: error.message || "Failed to trigger check payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBill = (billId: string) => {
    deleteBillMutation.mutate(billId);
    
    toast({
      title: "Bill deleted",
      description: "The bill has been deleted successfully.",
    });
  };

  const toggleOverdueSelect = (billId: string) => {
    setSelectedOverdueIds(prev => {
      const next = new Set(prev);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });
  };

  const handleSelectAllOverdue = () => {
    if (selectedOverdueIds.size === carryoverBills.length) {
      setSelectedOverdueIds(new Set());
    } else {
      setSelectedOverdueIds(new Set(carryoverBills.map(b => b.id)));
    }
  };

  const handleBulkDeleteOverdue = async () => {
    if (selectedOverdueIds.size === 0) return;
    const count = selectedOverdueIds.size;
    setBulkDeleting(true);
    setShowBulkDeleteConfirm(false);
    try {
      await Promise.all(
        Array.from(selectedOverdueIds).map(id =>
          fetch(`/api/bills/${id}`, { method: 'DELETE', credentials: 'include' })
        )
      );
      setSelectedOverdueIds(new Set());
      setOverdueSelectMode(false);
      toast({
        title: `${count} bill${count > 1 ? 's' : ''} deleted`,
        description: "Selected overdue bills have been removed.",
      });
      // Refresh data
      const { queryClient: qc } = await import("@/lib/queryClient");
      qc.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      qc.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      qc.invalidateQueries({ queryKey: ["/api/bills/carryover"], exact: false });
    } catch {
      toast({
        title: "Delete failed",
        description: "Some bills could not be deleted. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDuplicateBill = (billId: string) => {
    duplicateBillMutation.mutate(billId, {
      onSuccess: (data) => {
        toast({
          title: "Bill duplicated",
          description: data.message || "A copy of the bill has been created.",
        });
      },
      onError: () => {
        toast({
          title: "Duplication failed",
          description: "Failed to duplicate the bill. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleEditPayment = (billId: string) => {
    // Open payment modal to edit payment details
    setSelectedBillId(billId);
    setPaymentFlow("record");
    setShowPaymentModal(true);
  };

  const handleRetryPayment = async (billId: string) => {
    setRetryingPayments(prev => new Set([...prev, billId]));
    try {
      const response = await fetch("/api/billcom/trigger-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ billId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to retry payment: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Check Sent Successfully!",
          description: "Your payment has been sent to the creditor. Check will be mailed within 1-2 business days.",
        });
        
        // Refresh the bills data
        window.location.reload();
      } else {
        throw new Error(result.error || "Failed to send payment");
      }
    } catch (error: any) {
      console.error("Error retrying payment:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to send payment. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setRetryingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });
    }
  };

  const handleSaveReminder = (preferences: ReminderPreferences) => {
    // In a real app, save reminder preferences
    toast({
      title: "Reminders updated",
      description: "Your reminder preferences have been saved.",
    });
  };



  const handleSettings = () => {
    setLocation("/settings");
  };

  const handleLogout = () => {
    signOut({ redirectUrl: "/" });
  };

  const currentMonth = format(selectedDate, "MMMM yyyy");
  
  // Calculate total amount based on active filter
  const monthlyTotal = bills
    .filter(bill => {
      if (activeFilter === "paid") {
        return bill.status === "paid"; // Only paid bills when "Paid" tab is active
      } else {
        return bill.status !== "paid"; // Only unpaid bills when "All Bills" tab is active
      }
    })
    .reduce((total, bill) => total + parseFloat(bill.amount || "0"), 0);
  
  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    const startDate = new Date(2024, 0, 1);
    const endDate = addMonths(today, 12);

    let current = new Date(startDate);
    while (current <= endDate) {
      const value = format(current, "yyyy-MM");
      const label = format(current, "MMMM yyyy");
      options.push({ value, label, date: new Date(current) });
      current = addMonths(current, 1);
    }

    return options;
  };
  
  const monthOptions = generateMonthOptions();
  
  const handleMonthChange = (value: string) => {
    const selectedOption = monthOptions.find(option => option.value === value);
    if (selectedOption) {
      setSelectedDate(selectedOption.date);
    }
  };

  return (
    <Layout>
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">BillWatch</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              onClick={handleSettings}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              onClick={handleLogout}
              data-testid="button-logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Month Selector */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-center">
          <Select 
            value={format(selectedDate, "yyyy-MM")} 
            onValueChange={handleMonthChange}
            onOpenChange={(open) => {
              if (!open) return;

              requestAnimationFrame(() => {
                const currentValue = format(selectedDate, "yyyy-MM");
                const selectedMonth = document.querySelector(`[data-value="${currentValue}"]`) as HTMLElement | null;
                selectedMonth?.scrollIntoView({ behavior: "instant", block: "nearest" });
              });
            }}
          >
            <SelectTrigger className="w-auto border-0 shadow-none text-center font-medium">
              <div className="flex items-center space-x-2">
                <span>{currentMonth}</span>
                <span className="text-primary font-semibold">
                  ${monthlyTotal.toFixed(2)}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      {statsLoading ? (
        <div className="p-4 bg-gradient-to-r from-primary to-blue-600">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <Skeleton className="h-6 w-16 mx-auto mb-2" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : stats ? (
        <StatsSummary stats={stats} selectedMonth={currentMonth} onOverdueClick={() => {
          overdueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }} />
      ) : null}

      {/* Quick Actions */}
      <div className="p-4 border-b border-border">
        <div className="flex space-x-3">
          <Button 
            variant="secondary" 
            className="flex-1 p-3 flex items-center justify-center space-x-2"
            onClick={() => setShowAddBillModal(true)}
            data-testid="button-add-bill-manually"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium text-sm">Add Bill</span>
          </Button>
          <Button 
            className="flex-1 p-3 flex items-center justify-center space-x-2"
            onClick={() => setShowScanModal(true)}
            data-testid="button-scan-document"
          >
            <Camera className="h-4 w-4" />
            <span className="font-medium text-sm">Scan Bill</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-4">
        <div className="flex space-x-1 bg-muted rounded-lg p-1">
          <Button
            variant={activeFilter === "all" ? "default" : "ghost"}
            size="sm"
            className="flex-1 text-xs font-medium"
            onClick={() => setActiveFilter("all")}
            data-testid="button-filter-all"
          >
            All Bills
          </Button>
          <Button
            variant={activeFilter === "paid" ? "default" : "ghost"}
            size="sm"
            className="flex-1 text-xs font-medium"
            onClick={() => setActiveFilter("paid")}
            data-testid="button-filter-paid"
          >
            Paid
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bills by company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
            data-testid="input-search-bills"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="pl-10 text-sm"
              placeholder="Filter by due date"
            />
          </div>
          {searchDate && (
            <Button variant="ghost" size="sm" onClick={() => setSearchDate("")} className="px-2">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {(searchQuery.trim() !== "" || searchDate) && (
          <div className="mt-2 text-xs text-muted-foreground" data-testid="text-search-results">
            {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} found
            {searchQuery.trim() !== "" && <> for "{searchQuery}"</>}
            {searchDate && <> on {format(new Date(searchDate + 'T12:00:00'), 'MMM dd, yyyy')}</>}
          </div>
        )}
      </div>

      {/* Bills List */}
      <div className="p-4 pb-24 space-y-3">
        {billsLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-8" data-testid="empty-bills-state">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No bills found</h3>
            <p className="text-muted-foreground mb-4">
              {activeFilter === "all" 
                ? "Start by adding your first bill or scanning a document."
                : `No bills match the "${activeFilter.replace("_", " ")}" filter.`
              }
            </p>
            <Button 
              onClick={() => setShowScanModal(true)}
              data-testid="button-scan-first-bill"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan Your First Bill
            </Button>
          </div>
        ) : (
          filteredBills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              onMarkAsPaid={handleMarkAsPaid}
              onSetReminder={handleSetReminder}
              onPayNow={handlePayNow}
              onSnooze={handleSnooze}
              onDelete={handleDeleteBill}
              onEditPayment={handleEditPayment}
              onRetryPayment={handleRetryPayment}
              onDuplicate={handleDuplicateBill}
            />
          ))
        )}

        {/* Carryover Overdue Bills Section */}
        {carryoverBills.length > 0 && (
          <div ref={overdueRef} className="mt-6 pt-4 border-t border-border">
            <div className="mb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
                    <span>⚠️</span>
                    <span>Overdue from Previous Months</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    These bills are past due and need immediate attention
                  </p>
                  <div className="text-sm font-medium text-red-600 mt-1">
                    Total: ${carryoverBills.reduce((sum, bill) => sum + parseFloat(bill.amount.toString()), 0).toFixed(2)}
                  </div>
                </div>
                <Button
                  variant={overdueSelectMode ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 mt-1"
                  onClick={() => {
                    setOverdueSelectMode(m => !m);
                    setSelectedOverdueIds(new Set());
                  }}
                >
                  {overdueSelectMode ? "Cancel" : "Select"}
                </Button>
              </div>

              {overdueSelectMode && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllOverdue}
                    className="flex items-center gap-1.5"
                  >
                    {selectedOverdueIds.size === carryoverBills.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedOverdueIds.size === carryoverBills.length ? "Deselect All" : "Select All"}
                  </Button>
                  {selectedOverdueIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      disabled={bulkDeleting}
                      className="flex items-center gap-1.5"
                    >
                      {bulkDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete ({selectedOverdueIds.size})
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {carryoverLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {carryoverBills.map((bill) => (
                  <div
                    key={bill.id}
                    className={`relative flex items-stretch${overdueSelectMode ? " cursor-pointer" : ""}`}
                    onClick={overdueSelectMode ? () => toggleOverdueSelect(bill.id) : undefined}
                  >
                    {overdueSelectMode && (
                      <div className="flex items-center justify-center w-12 shrink-0">
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${selectedOverdueIds.has(bill.id) ? "bg-primary border-primary" : "border-muted-foreground bg-background"}`}>
                          {selectedOverdueIds.has(bill.id) && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <BillCard
                        bill={bill}
                        onMarkAsPaid={overdueSelectMode ? undefined : handleMarkAsPaid}
                        onSetReminder={overdueSelectMode ? undefined : handleSetReminder}
                        onPayNow={overdueSelectMode ? undefined : handlePayNow}
                        onSnooze={overdueSelectMode ? undefined : handleSnooze}
                        onDelete={overdueSelectMode ? undefined : handleDeleteBill}
                        onEditPayment={overdueSelectMode ? undefined : handleEditPayment}
                        onRetryPayment={overdueSelectMode ? undefined : handleRetryPayment}
                        onDuplicate={overdueSelectMode ? undefined : handleDuplicateBill}
                      />
                    </div>
                    {overdueSelectMode && selectedOverdueIds.has(bill.id) && (
                      <div className="absolute inset-0 rounded-lg border-2 border-primary bg-primary/5 pointer-events-none" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg hover:shadow-xl z-30"
        onClick={() => setShowScanModal(true)}
        data-testid="button-floating-action"
      >
        <Plus className="h-5 w-5" />
      </Button>

      {showBackToTop && (
        <Button
          variant="outline"
          className="fixed bottom-20 left-4 w-10 h-10 rounded-full shadow-lg hover:shadow-xl z-30 bg-white/90 backdrop-blur-sm"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      )}

      {/* Modals */}
      <ScanModal 
        open={showScanModal} 
        onOpenChange={setShowScanModal}
      />

      <AddBillModal 
        open={showAddBillModal} 
        onOpenChange={setShowAddBillModal} 
      />
      
      <ReminderModal
        open={showReminderModal}
        onOpenChange={setShowReminderModal}
        onSave={handleSaveReminder}
      />
      
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        bill={bills.find(b => b.id === selectedBillId) || null}
        initialFlow={paymentFlow}
      />

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedOverdueIds.size} overdue bill{selectedOverdueIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedOverdueIds.size === 1 ? 'this bill' : `these ${selectedOverdueIds.size} bills`}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteOverdue}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
