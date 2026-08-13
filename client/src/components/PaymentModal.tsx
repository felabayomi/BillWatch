import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useBillPayments, useBillBalance, useCreatePayment } from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { Bill, Account } from "@shared/schema";
import { CreditCard, DollarSign, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Link } from "wouter";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  initialFlow?: "record" | "pay_now";
}

export function PaymentModal({ open, onOpenChange, bill, initialFlow = "record" }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentType, setPaymentType] = useState<"manual" | "automatic">("manual");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentFlow, setPaymentFlow] = useState<"record" | "pay_now">("record");
  const [isPartialPayment, setIsPartialPayment] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userEmail = (user as any)?.email;

  const accountsUrl = userEmail
    ? `/api/accounts?email=${encodeURIComponent(userEmail)}`
    : "/api/accounts";
  const { data: userAccounts = [] } = useQuery<Account[]>({
    queryKey: [accountsUrl],
    enabled: !!user && open,
  });

  // New payment hooks for enhanced functionality
  const { data: paymentsData, isLoading: paymentsLoading } = useBillPayments(bill?.id || null);
  const { data: balanceData, isLoading: balanceLoading } = useBillBalance(bill?.id || null);
  const createPaymentMutation = useCreatePayment();

  // Legacy mutation for backward compatibility
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: { id: string; paymentMethod: string; paymentType: "manual" | "automatic"; paidAmount: string }) => {
      const response = await fetch(`/api/bills/${data.id}/payment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod: data.paymentMethod,
          paymentType: data.paymentType,
          paidAmount: data.paidAmount,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      const billId = variables.id;
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"] });
      // Critical fix: invalidate bill-specific cache keys for immediate UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/bills", billId, "balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills", billId, "payments"] });
      toast({
        title: "Payment details updated",
        description: "Payment information has been saved successfully.",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating payment details:", error);
      toast({
        title: "Error",
        description: "Failed to update payment details. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (data: { amount: string; billId: string }) => {
      const response = await apiRequest("POST", "/api/payments/create-checkout", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      // Redirect to Stripe hosted checkout
      console.log("Checkout data:", data);
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error("No checkout URL received:", data);
      }
    },
    onError: (error) => {
      console.error("Error creating checkout session:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setPaymentMethod("");
    setPaymentType("manual");
    setPaymentAmount("");
    setPaymentFlow("record");
    setIsPartialPayment(true);
  };

  // Calculate payment progress percentage
  const getPaymentProgress = () => {
    if (!balanceData) return 0;
    const { totalAmount, paidAmount } = balanceData;
    return totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;
  };

  // Format currency consistently
  const formatCurrency = (amount: number | string) => {
    return parseFloat(amount.toString()).toFixed(2);
  };

  // Format date for payment history
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Unknown date';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Validate payment amount (cached for performance)
  const paymentValidation = useMemo(() => {
    if (!balanceData || !paymentAmount) return { isValid: true, message: "" };
    
    const amount = parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      return { isValid: false, message: "Please enter a valid payment amount." };
    }
    
    return { isValid: true, message: "" };
  }, [balanceData, paymentAmount]);

  // Legacy function for backward compatibility
  const validatePaymentAmount = (amount: string) => {
    if (!balanceData || !amount) return { isValid: true, message: "" };
    
    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return { isValid: false, message: "Please enter a valid payment amount." };
    }
    
    return { isValid: true, message: "" };
  };

  const handleSave = () => {
    if (!bill) return;
    
    const validation = validatePaymentAmount(paymentAmount);
    if (!validation.isValid) {
      toast({
        title: "Invalid payment amount",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    if (paymentFlow === "pay_now") {
      // Create checkout session for Stripe payment
      createCheckoutMutation.mutate({
        amount: paymentAmount,
        billId: bill.id,
      });
    } else {
      // Check if bill has existing payment history to determine which API to use
      const hasPaymentHistory = paymentsData?.payments && paymentsData.payments.length > 0;
      
      if (hasPaymentHistory || isPartialPayment) {
        // Use new payment API for bills with payment history or partial payments
        if (!paymentMethod.trim()) {
          toast({
            title: "Missing information",
            description: "Please enter the payment method used.",
            variant: "destructive",
          });
          return;
        }

        createPaymentMutation.mutate({
          billId: bill.id,
          amount: paymentAmount,
          paymentMethod: paymentMethod.trim(),
          paymentType,
          status: "succeeded",
          paidAt: new Date(),
        }, {
          onSuccess: () => {
            toast({
              title: "Payment recorded",
              description: "Payment has been recorded successfully.",
            });
            resetForm();
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error creating payment:", error);
            toast({
              title: "Error",
              description: "Failed to record payment. Please try again.",
              variant: "destructive",
            });
          },
        });
      } else {
        // Use legacy API for backward compatibility with bills without payment history
        if (!paymentMethod.trim()) {
          toast({
            title: "Missing information",
            description: "Please enter the payment method used.",
            variant: "destructive",
          });
          return;
        }

        updatePaymentMutation.mutate({
          id: bill.id,
          paymentMethod: paymentMethod.trim(),
          paymentType,
          paidAmount: paymentAmount,
        });
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  // Pre-fill form based on payment history and bill data
  useEffect(() => {
    if (bill && open) {
      setPaymentMethod(bill.paymentMethod || "");
      setPaymentType((bill.paymentType as "manual" | "automatic") || "manual");
      
      // Smart default amount: remaining balance or full amount if no payments exist
      if (balanceData) {
        const defaultAmount = balanceData.remainingBalance > 0 
          ? balanceData.remainingBalance.toString() 
          : bill.amount.toString();
        setPaymentAmount(defaultAmount);
        
        // Default to partial payment mode if there's existing payment history
        setIsPartialPayment(balanceData.paidAmount > 0 || balanceData.remainingBalance < parseFloat(bill.amount.toString()));
      } else {
        setPaymentAmount(bill.amount.toString());
      }
      
      setPaymentFlow(initialFlow);
    }
  }, [bill, open, initialFlow, balanceData]);

  // Show loading skeleton while data is loading
  if (balanceLoading && open && bill) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg" data-testid="payment-modal">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="flex justify-end space-x-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto" data-testid="payment-modal">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
            {/* Bill Summary with Balance Info */}
            {bill && balanceData && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg border" data-testid="bill-summary">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-sm" data-testid="text-company-name">{bill.company}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(bill.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" data-testid="text-remaining-balance">
                      ${formatCurrency(balanceData.remainingBalance)}
                    </div>
                    <div className="text-xs text-muted-foreground">remaining</div>
                  </div>
                </div>
                
                {/* Payment Progress Bar */}
                <div className="space-y-2" data-testid="payment-progress">
                  <div className="flex justify-between text-xs">
                    <span>Payment Progress</span>
                    <span>{Math.round(getPaymentProgress())}% paid</span>
                  </div>
                  <Progress value={getPaymentProgress()} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Paid: ${formatCurrency(balanceData.paidAmount)}</span>
                    <span>Total: ${formatCurrency(balanceData.totalAmount)}</span>
                  </div>
                </div>

                {bill.minimumPayment && (
                  <div className="mt-2 text-xs text-muted-foreground" data-testid="text-minimum-payment">
                    Minimum Payment: ${formatCurrency(bill.minimumPayment)}
                  </div>
                )}
              </div>
            )}

            {/* Payment History Section */}
            {paymentsLoading ? (
              <div className="space-y-3" data-testid="payment-history-loading">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Label className="font-medium">Payment History</Label>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
            ) : paymentsData?.payments && paymentsData.payments.length > 0 && (
              <div className="space-y-3" data-testid="payment-history">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Label className="font-medium">Payment History</Label>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <div className="space-y-2">
                    {paymentsData.payments.map((payment, index) => (
                      <div key={payment.id} className="flex items-center justify-between text-sm" data-testid={`payment-history-${index}`}>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(payment.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${formatCurrency(payment.amount)}</span>
                          <span className="text-xs text-muted-foreground">
                            {payment.paymentMethod}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Payment Options */}
            <div className="space-y-3">
              <Label>Payment Options</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsPartialPayment(true);
                    if (balanceData) {
                      setPaymentAmount(Math.min(balanceData.remainingBalance, parseFloat(bill?.minimumPayment?.toString() || "0") || balanceData.remainingBalance).toString());
                    }
                  }}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    isPartialPayment 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  data-testid="button-partial-payment"
                >
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <div>
                      <div className="font-medium text-sm">Partial Payment</div>
                      <div className="text-xs text-muted-foreground">Pay any amount</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setIsPartialPayment(false);
                    if (balanceData) {
                      setPaymentAmount(balanceData.remainingBalance.toString());
                    }
                  }}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    !isPartialPayment 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  data-testid="button-full-payment"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <div>
                      <div className="font-medium text-sm">Pay Remaining</div>
                      <div className="text-xs text-muted-foreground">
                        ${balanceData ? formatCurrency(balanceData.remainingBalance) : "0.00"}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                max={balanceData?.remainingBalance}
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                data-testid="input-payment-amount"
                className={paymentValidation.isValid ? "" : "border-red-500"}
              />
              {paymentAmount && !paymentValidation.isValid && (
                <div className="flex items-center gap-1 text-sm text-red-600" data-testid="payment-amount-error">
                  <AlertCircle className="h-3 w-3" />
                  <span>{paymentValidation.message}</span>
                </div>
              )}
              {balanceData && paymentAmount && paymentValidation.isValid && parseFloat(paymentAmount) > 0 && (
                <div className="text-sm" data-testid="payment-amount-preview">
                  {parseFloat(paymentAmount) === balanceData.remainingBalance ? (
                    <p className="text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      This will fully pay the remaining balance
                    </p>
                  ) : parseFloat(paymentAmount) < balanceData.remainingBalance ? (
                    <p className="text-blue-600 font-medium">
                      Remaining after payment: ${formatCurrency(balanceData.remainingBalance - parseFloat(paymentAmount))}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Payment Method - Account Selector */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">Bank/Card Used</Label>
              {userAccounts.length > 0 ? (
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="input-payment-method">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {userAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.name}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <Input
                    id="payment-method"
                    placeholder="e.g., Chase Credit Card, Wells Fargo Checking"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    data-testid="input-payment-method"
                  />
                  <p className="text-xs text-muted-foreground">
                    Go to the <Link href="/accounts" onClick={() => onOpenChange(false)} className="font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700">Accounts</Link> page to add or import your payment accounts from FinanceWatch for quick selection here.
                  </p>
                </>
              )}
            </div>

            {/* Payment Type */}
            <div className="space-y-3">
              <Label>Payment Type</Label>
              <RadioGroup 
                value={paymentType} 
                onValueChange={(value: "manual" | "automatic") => setPaymentType(value)}
                className="flex flex-row space-x-6"
                data-testid="radio-payment-type"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="cursor-pointer">Manual Payment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="automatic" id="automatic" />
                  <Label htmlFor="automatic" className="cursor-pointer">Automatic Payment</Label>
                </div>
              </RadioGroup>
            </div>

            {paymentFlow === "pay_now" && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <CreditCard className="h-4 w-4 inline mr-1" />
                  You'll be redirected to a secure payment page to complete your payment with credit card or bank account.
                </p>
              </div>
            )}
          </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {bill?.status === "paid" && balanceData?.remainingBalance === 0 && (
              <Button 
                variant="outline"
                onClick={async () => {
                  if (!bill) return;
                  try {
                    // Mark bill as unpaid, which will reset payment status
                    const response = await fetch(`/api/bills/${bill.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        status: "upcoming"
                      }),
                    });
                    
                    if (response.ok) {
                      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"] });
                      // Invalidate bill-specific cache keys for consistency
                      queryClient.invalidateQueries({ queryKey: ["/api/bills", bill.id, "balance"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/bills", bill.id, "payments"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/bills/carryover"] });
                      toast({
                        title: "Bill marked as unpaid",
                        description: "The bill has been marked as unpaid successfully.",
                      });
                      onOpenChange(false);
                    } else {
                      throw new Error('Failed to update bill');
                    }
                  } catch (error) {
                    console.error("Error marking bill as unpaid:", error);
                    toast({
                      title: "Error",
                      description: "Failed to mark bill as unpaid. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={updatePaymentMutation.isPending || createPaymentMutation.isPending}
                data-testid="button-mark-unpaid"
              >
                Mark as Unpaid
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              data-testid="button-payment-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={
                updatePaymentMutation.isPending || 
                createCheckoutMutation.isPending || 
                createPaymentMutation.isPending ||
                !paymentValidation.isValid ||
                !paymentAmount ||
                parseFloat(paymentAmount) <= 0 ||
                !paymentMethod.trim()
              }
              data-testid="button-payment-save"
            >
              {updatePaymentMutation.isPending || createPaymentMutation.isPending ? "Saving..." : 
               createCheckoutMutation.isPending ? "Processing..." :
               paymentFlow === "pay_now" ? "Pay Now" : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}