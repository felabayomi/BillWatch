import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'error' | 'processing'>('processing');
  const [billCompany, setBillCompany] = useState<string>('');
  const [isDirectPayment, setIsDirectPayment] = useState<boolean>(false);
  const [paymentStatusType, setPaymentStatusType] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [billId, setBillId] = useState<string>('');
  const [billAmount, setBillAmount] = useState<string>('');
  const [canTriggerBillCom, setCanTriggerBillCom] = useState<boolean>(false);
  const [isTriggeringPayment, setIsTriggeringPayment] = useState<boolean>(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const billIdParam = urlParams.get('bill_id') || urlParams.get('billId');
    const amount = urlParams.get('amount');
    const provider = urlParams.get('provider');
    const company = urlParams.get('company');

    // Handle BILL.com payments (provider=billcom)
    if (provider === 'billcom') {
      setBillCompany(company || 'Your Bill');
      setBillAmount(amount || '');
      setBillId(billIdParam || '');
      setPaymentStatus('success');
      setIsDirectPayment(true);
      setPaymentStatusType('processing');
      setPaymentMethod('ach');
      setIsProcessing(false);
      
      toast({
        title: "Payment Portal Created!",
        description: `Your BILL.com payment flow for ${company} ($${amount}) has been set up successfully. The payment will be processed when you complete it on BILL.com's secure portal.`,
      });
      
      return;
    }

    // Handle Stripe payments (legacy)
    if (!sessionId || !billIdParam || !amount) {
      setPaymentStatus('error');
      setIsProcessing(false);
      return;
    }

    // Confirm the payment on the backend
    const confirmPayment = async () => {
      try {
        const response = await apiRequest("POST", "/api/payments/confirm-checkout", {
          sessionId,
          billId,
          actualAmount: amount
        });
        
        const result = await response.json();
        setBillCompany(result.bill?.company || 'Bill');
        setIsDirectPayment(result.directPayment || false);
        setPaymentStatusType(result.paymentStatus || 'completed');
        setPaymentMethod(result.bill?.creditorPaymentMethod || '');
        setBillId(billId || '');
        setBillAmount(amount || '');
        
        // Check if this bill can be triggered through BILL.com
        // (paid but not yet sent through BILL.com)
        const canTrigger = result.bill?.status === 'paid' && !result.bill?.billComPaymentId;
        setCanTriggerBillCom(canTrigger);
        
        setPaymentStatus('success');
        
        // Show different message based on whether direct payment was processed
        // Show method-specific messaging
        const paymentMethod = result.bill?.creditorPaymentMethod;
        let deliveryMessage = "They will receive the funds within 1-3 business days.";
        
        if (paymentMethod === 'check') {
          deliveryMessage = "A check will be mailed to them within 1-2 business days.";
        } else if (paymentMethod === 'ach') {
          deliveryMessage = "Funds will be transferred electronically within 1-3 business days.";
        }
        
        toast({
          title: "Payment Successful!",
          description: result.directPayment 
            ? `Your payment of $${amount} is being sent directly to ${result.bill?.company}. ${deliveryMessage}`
            : `Your payment of $${amount} has been processed successfully.`,
        });
      } catch (error: any) {
        console.error("Error confirming payment:", error);
        setPaymentStatus('error');
        
        // Try to get more specific error info
        let errorMessage = "There was an issue confirming your payment. Please contact support.";
        
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Payment Confirmation Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    confirmPayment();
  }, [toast]);

  const handleReturnHome = () => {
    setLocation("/");
  };

  const handleTriggerBillComPayment = async () => {
    if (!billId) return;
    
    setIsTriggeringPayment(true);
    try {
      const response = await apiRequest("POST", "/api/stripe/payouts/retry-payment", {
        billId: billId
      });
      
      const result = await response.json();
      
      toast({
        title: "Payment Sent Successfully!",
        description: result.message || `Bank transfer to ${billCompany} has been initiated. Payment will arrive within 1-3 business days.`,
      });
      
      // Update state to reflect that payment has been triggered
      setCanTriggerBillCom(false);
      setIsDirectPayment(true);
      setPaymentStatusType('processing');
      
    } catch (error: any) {
      console.error("Error triggering Stripe payout:", error);
      toast({
        title: "Error Sending Payment",
        description: error.message || "Failed to send payment through Stripe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTriggeringPayment(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Processing Payment</h1>
          <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-destructive">Payment Error</h1>
            <p className="text-muted-foreground">
              There was an issue processing your payment. Please try again or contact support if the problem persists.
            </p>
          </div>
          <Button onClick={handleReturnHome} className="w-full" data-testid="button-return-home">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
          <p className="text-muted-foreground">
            {isDirectPayment ? (
              <>
                Your payment for {billCompany} is being sent directly to them. 
                {paymentStatusType === 'processing' ? (
                  <span className="block mt-2 text-sm font-medium text-blue-600">
                    Status: Processing - {paymentMethod === 'check' 
                      ? 'Check will be mailed within 1-2 business days'
                      : paymentMethod === 'ach' 
                      ? 'Electronic transfer within 1-3 business days'
                      : 'Funds will be delivered within 1-3 business days'}
                  </span>
                ) : (
                  <span className="block mt-2 text-sm">
                    The bill has been marked as paid in your dashboard.
                  </span>
                )}
              </>
            ) : (
              <>
                Your payment for {billCompany} has been processed successfully. The bill has been marked as paid in your dashboard.
              </>
            )}
          </p>
        </div>
        <div className="space-y-3">
          {canTriggerBillCom && (
            <Button 
              onClick={handleTriggerBillComPayment} 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={isTriggeringPayment}
              data-testid="button-trigger-billcom"
            >
              {isTriggeringPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Check to {billCompany}...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Check to {billCompany} Now
                </>
              )}
            </Button>
          )}
          <Button onClick={handleReturnHome} className="w-full" variant={canTriggerBillCom ? "outline" : "default"} data-testid="button-return-home">
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}