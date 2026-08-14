import { Bill } from "@shared/schema";
import { parseLocalDate } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Bell, Check, Clock, CreditCard, Zap, Wifi, Flame, Phone, Star, Repeat, Trash2, Edit, Pencil, Send, Copy, Receipt, Upload, Eye, FileText } from "lucide-react";
import { format, formatDistanceToNow, isAfter, differenceInDays } from "date-fns";
import { useBillBalance } from "@/hooks/usePayments";
import { useLocation } from "wouter";
import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BillCardProps {
  bill: Bill;
  onMarkAsPaid?: (billId: string) => void;
  onSetReminder?: (billId: string) => void;
  onPayNow?: (billId: string) => void;
  onSnooze?: (billId: string) => void;
  onDelete?: (billId: string) => void;
  onEditPayment?: (billId: string) => void;
  onRetryPayment?: (billId: string) => void;
  onDuplicate?: (billId: string) => void;
}

const categoryIcons = {
  electricity: Zap,
  internet: Wifi,
  gas: Flame,
  phone: Phone,
  credit_card: CreditCard,
  default: CreditCard,
};

const categoryColors = {
  electricity: "bg-amber-100 text-amber-600",
  internet: "bg-blue-100 text-blue-600", 
  gas: "bg-orange-100 text-orange-600",
  phone: "bg-green-100 text-green-600",
  credit_card: "bg-red-100 text-red-600",
  default: "bg-gray-100 text-gray-600",
};

export function BillCard({ bill, onMarkAsPaid, onSetReminder, onPayNow, onSnooze, onDelete, onEditPayment, onRetryPayment, onDuplicate }: BillCardProps) {
  const [, setLocation] = useLocation();
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: "invoice" | "receipt" }) => {
      const formData = new FormData();
      formData.append(type, file);
      const res = await fetch(`/api/bills/${bill.id}/${type}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills", bill.id] });
      const label = variables.type === "invoice" ? "Invoice" : "Receipt";
      toast({ title: `${label} uploaded`, description: `Your ${label.toLowerCase()} has been saved.` });
    },
    onError: (error: Error, variables) => {
      const label = variables.type === "invoice" ? "Invoice" : "Receipt";
      toast({ title: `${label} upload failed`, description: error.message || `Could not upload ${label.toLowerCase()}. Try again.`, variant: "destructive" });
    },
  });

  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFileMutation.mutate({ file, type: "invoice" });
    if (invoiceInputRef.current) invoiceInputRef.current.value = "";
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFileMutation.mutate({ file, type: "receipt" });
    if (receiptInputRef.current) receiptInputRef.current.value = "";
  };

  const triggerInvoiceUpload = () => {
    setTimeout(() => { invoiceInputRef.current?.click(); }, 100);
  };

  const triggerReceiptUpload = () => {
    setTimeout(() => { receiptInputRef.current?.click(); }, 100);
  };

  const handleViewInvoice = () => {
    if (bill.invoiceUrl) window.open(bill.invoiceUrl, "_blank");
  };

  const handleViewReceipt = () => {
    if (bill.receiptUrl) window.open(bill.receiptUrl, "_blank");
  };
  const IconComponent = categoryIcons[bill.category as keyof typeof categoryIcons] || categoryIcons.default;
  const iconColor = categoryColors[bill.category as keyof typeof categoryColors] || categoryColors.default;
  
  // Fetch balance data for bills that might have partial payments
  // Only fetch if bill is paid or if we suspect partial payments
  const shouldFetchBalance = bill.status === "paid" || (bill.paidAmount && parseFloat(bill.paidAmount.toString()) > 0);
  const { data: balanceData, isLoading: balanceLoading, error: balanceError } = useBillBalance(
    shouldFetchBalance ? bill.id : null
  );
  
  // Determine if bill is partially paid
  const isPartiallyPaid = balanceData && balanceData.paidAmount > 0 && balanceData.remainingBalance > 0;
  const paymentProgress = balanceData ? Math.min((balanceData.paidAmount / balanceData.totalAmount) * 100, 100) : 0;
  
  const dueDate = parseLocalDate(bill.dueDate);
  const now = new Date();
  // Normalize both dates to start of day to avoid timezone issues
  const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const nowNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntilDue = differenceInDays(dueDateNormalized, nowNormalized);
  
  // Determine status and styling with new color system
  let statusLabel = "";
  let statusClass = "";
  let borderClass = "";
  
  if (isPartiallyPaid) {
    statusLabel = "Partially Paid";
    statusClass = "status-partially-paid";
    borderClass = "border-blue-500/50 bg-blue-50/30"; // Blue for partially paid
  } else if (bill.status === "paid") {
    // Check if payment failed to send to creditor (only for real payments through app)
    if (bill.paymentType === 'real_payment' && !bill.stripePayoutId) {
      statusLabel = "Payment Pending";
      statusClass = "status-warning";
      borderClass = "border-orange-500/50 bg-orange-50/30";
    } else {
      statusLabel = "Paid";
      statusClass = "status-paid";
    }
  } else if (bill.status === "overdue" || daysUntilDue < 0) {
    statusLabel = `Overdue ${Math.abs(daysUntilDue)} days`;
    statusClass = "status-overdue";
    borderClass = "border-red-500/50 bg-red-50/30"; // Red for overdue
  } else if (daysUntilDue <= 4) {
    statusLabel = daysUntilDue === 0 ? "Due today" : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
    statusClass = "status-critical";
    borderClass = "border-yellow-500/50 bg-yellow-50/30"; // Yellow for 4 days or less
  } else if (daysUntilDue <= 7) {
    statusLabel = `Due in ${daysUntilDue} days`;
    statusClass = "status-warning"; 
    borderClass = "border-amber-500/50 bg-amber-50/30"; // Amber for within a week
  } else {
    statusLabel = `Due in ${daysUntilDue} days`;
    statusClass = "status-upcoming";
  }

  const isPaid = bill.status === "paid" && !isPartiallyPaid;
  const isOverdue = bill.status === "overdue" || daysUntilDue < 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or dropdowns
    if ((e.target as HTMLElement).closest('button, [role="menuitem"], input[type="file"]')) {
      return;
    }
    setLocation(`/bill/${bill.id}`);
  };

  return (
    <div 
      className={`bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${borderClass} ${isPaid ? 'opacity-75' : ''}`}
      data-testid={`bill-card-${bill.id}`}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className={`w-10 h-10 ${iconColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <div className="flex flex-col">
                <h3 
                  className={`font-medium text-foreground text-sm ${isPaid ? 'line-through' : ''}`}
                  data-testid={`bill-company-${bill.id}`}
                >
                  {bill.company}
                </h3>
                {bill.billType === "business" && bill.businessName && (
                  <p 
                    className="text-muted-foreground text-xs mt-0.5"
                    data-testid={`bill-business-name-${bill.id}`}
                  >
                    Business: {bill.businessName}
                  </p>
                )}
              </div>
              {bill.isRecurring && (
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" data-testid={`bill-recurring-star-${bill.id}`} />
                  <Repeat className="h-3 w-3 text-blue-500" data-testid={`bill-recurring-icon-${bill.id}`} />
                </div>
              )}
              <span 
                className={`${statusClass} px-2 py-1 rounded-full text-xs font-medium`}
                data-testid={`bill-status-${bill.id}`}
              >
                {statusLabel}
              </span>
            </div>
            {bill.accountNumber && (
              <p 
                className="text-muted-foreground text-xs mt-1"
                data-testid={`bill-account-${bill.id}`}
              >
                Account: {bill.accountNumber}
              </p>
            )}
            {bill.isRecurring && bill.installmentNumber && bill.totalInstallments && (
              <p 
                className="text-muted-foreground text-xs mt-1 font-medium"
                data-testid={`bill-installment-${bill.id}`}
              >
                Payment {bill.installmentNumber} of {bill.totalInstallments}
                {bill.originalAmount && (
                  <span className="ml-2 text-primary">
                    (${parseFloat(bill.originalAmount.toString()).toFixed(2)} total)
                  </span>
                )}
              </p>
            )}
            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-col">
                {balanceLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                    <span className="text-xs text-muted-foreground">Loading balance...</span>
                  </div>
                ) : isPartiallyPaid && balanceData ? (
                  <>
                    <span className="text-lg font-semibold text-blue-600" data-testid={`bill-amount-${bill.id}`}>
                      Paid: ${balanceData.paidAmount.toFixed(2)} of ${balanceData.totalAmount.toFixed(2)}
                    </span>
                    <span className="text-sm font-medium text-orange-600" data-testid={`bill-remaining-balance-${bill.id}`}>
                      Remaining: ${balanceData.remainingBalance.toFixed(2)}
                    </span>
                  </>
                ) : bill.status === "paid" && bill.paidAmount ? (
                  <>
                    <span className="text-lg font-semibold text-green-600" data-testid={`bill-amount-${bill.id}`}>
                      ${parseFloat(bill.paidAmount.toString()).toFixed(2)} paid
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Due: ${parseFloat(bill.amount.toString()).toFixed(2)}
                      {parseFloat(bill.paidAmount.toString()) !== parseFloat(bill.amount.toString()) && (
                        <span className={parseFloat(bill.paidAmount.toString()) > parseFloat(bill.amount.toString()) ? "text-green-600 ml-1" : "text-amber-600 ml-1"}>
                          ({parseFloat(bill.paidAmount.toString()) > parseFloat(bill.amount.toString()) ? '+' : ''}
                          ${(parseFloat(bill.paidAmount.toString()) - parseFloat(bill.amount.toString())).toFixed(2)})
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <span 
                    className={`text-lg font-semibold ${
                      isOverdue && !isPaid && !isPartiallyPaid ? 'text-destructive' : 
                      isPaid ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                    data-testid={`bill-amount-${bill.id}`}
                  >
                    ${parseFloat(bill.amount.toString()).toFixed(2)}
                  </span>
                )}
              </div>
              <span 
                className={`text-xs ${
                  isOverdue && !isPaid && !isPartiallyPaid ? 'text-destructive' : 'text-muted-foreground'
                }`}
                data-testid={`bill-due-date-${bill.id}`}
              >
                {isPaid && bill.paidDate ? (
                  <span className="flex items-center gap-1">
                    {`Paid ${format(new Date(bill.paidDate), 'MMM d')}`}
                    {bill.invoiceUrl && <FileText className="h-3 w-3 text-blue-500 inline" />}
                    {bill.receiptUrl && <Receipt className="h-3 w-3 text-green-600 inline" />}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    {`Due ${format(dueDate, 'MMM d')}`}
                    {bill.invoiceUrl && <FileText className="h-3 w-3 text-blue-500 inline" />}
                  </span>
                )}
              </span>
            </div>
            
            {/* Progress bar for partially paid bills */}
            {isPartiallyPaid && balanceData && !balanceLoading && (
              <div className="mt-3" data-testid={`bill-progress-container-${bill.id}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Payment Progress</span>
                  <span className="text-xs font-medium text-blue-600" data-testid={`bill-progress-percentage-${bill.id}`}>
                    {Math.round(paymentProgress)}%
                  </span>
                </div>
                <Progress 
                  value={paymentProgress} 
                  className="h-2" 
                  data-testid={`bill-progress-bar-${bill.id}`}
                />
              </div>
            )}
          </div>
        </div>
        {(isPaid || isPartiallyPaid) ? (
          <div className="flex items-center space-x-1" data-testid={`bill-paid-indicator-${bill.id}`}>
            {(bill.paymentType === 'real_payment' && !bill.billComPaymentId) ? (
              <Button 
                onClick={() => onRetryPayment?.(bill.id)}
                size="sm"
                variant="outline"
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                data-testid={`button-retry-payment-${bill.id}`}
              >
                <Send className="h-4 w-4 mr-1" />
                Send Check
              </Button>
            ) : (
              <div className="text-green-600">
                <Check className="h-5 w-5" />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 hover:bg-accent rounded transition-colors"
                  data-testid={`bill-paid-options-${bill.id}`}
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => onEditPayment?.(bill.id)}
                  className="flex items-center space-x-2"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Edit Payment</span>
                </DropdownMenuItem>
                {bill.invoiceUrl ? (
                  <DropdownMenuItem
                    onClick={handleViewInvoice}
                    className="flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Invoice</span>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={triggerInvoiceUpload}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>{bill.invoiceUrl ? "Replace Invoice" : "Upload Invoice"}</span>
                </DropdownMenuItem>
                {bill.receiptUrl ? (
                  <DropdownMenuItem
                    onClick={handleViewReceipt}
                    className="flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Receipt</span>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={triggerReceiptUpload}
                  className="flex items-center space-x-2"
                >
                  <Receipt className="h-4 w-4" />
                  <span>{bill.receiptUrl ? "Replace Receipt" : "Upload Receipt"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(bill.id)}
                  className="flex items-center space-x-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Bill</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 hover:bg-accent rounded transition-colors"
                  data-testid={`bill-options-${bill.id}`}
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => onMarkAsPaid?.(bill.id)}
                  className="flex items-center space-x-2"
                  data-testid={`menu-mark-paid-${bill.id}`}
                >
                  <Check className="h-4 w-4" />
                  <span>Mark as Paid</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSetReminder?.(bill.id)}
                  className="flex items-center space-x-2"
                  data-testid={`menu-set-reminder-${bill.id}`}
                >
                  <Bell className="h-4 w-4" />
                  <span>Set Reminder</span>
                </DropdownMenuItem>
                {onDuplicate && (
                  <DropdownMenuItem
                    onClick={() => onDuplicate(bill.id)}
                    className="flex items-center space-x-2"
                    data-testid={`menu-duplicate-${bill.id}`}
                  >
                    <Copy className="h-4 w-4" />
                    <span>Duplicate</span>
                  </DropdownMenuItem>
                )}
                {bill.invoiceUrl ? (
                  <DropdownMenuItem
                    onClick={handleViewInvoice}
                    className="flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Invoice</span>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={triggerInvoiceUpload}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>{bill.invoiceUrl ? "Replace Invoice" : "Upload Invoice"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(bill.id)}
                  className="flex items-center space-x-2 text-destructive focus:text-destructive"
                  data-testid={`menu-delete-${bill.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Bill</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      
      {!isPaid && !isPartiallyPaid && (
        <div className="mt-3 space-y-2">
          {/* Primary action row - Pay Now (for overdue) or Mark as Paid (for upcoming) */}
          <div className="flex space-x-2">
            <Button 
              onClick={() => onMarkAsPaid?.(bill.id)}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-3 rounded-md text-xs font-medium transition-colors"
              data-testid={`button-mark-paid-${bill.id}`}
            >
              Mark as Paid
            </Button>
            <Button 
              variant="outline"
              onClick={isOverdue ? () => onSnooze?.(bill.id) : () => onSetReminder?.(bill.id)}
              className="px-3 py-2 border border-border hover:bg-accent rounded-md text-xs font-medium transition-colors"
              data-testid={isOverdue ? `button-snooze-${bill.id}` : `button-set-reminder-${bill.id}`}
            >
              {isOverdue ? (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Snooze
                </>
              ) : (
                <>
                  <Bell className="h-3 w-3 mr-1" />
                  Remind
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      <input
        ref={invoiceInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleInvoiceUpload}
      />
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleReceiptUpload}
      />
    </div>
  );
}
