import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Send, AlertCircle, Loader2, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BottomNavigation } from "@/components/BottomNavigation";

export default function AdminTrigger() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [triggeringBills, setTriggeringBills] = useState<Set<string>>(new Set());
  const [reminderProcessing, setReminderProcessing] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testingStripePayouts, setTestingStripePayouts] = useState(false);
  const [testingPaymentEmail, setTestingPaymentEmail] = useState(false);
  const [retryingFailedPayments, setRetryingFailedPayments] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  const { data: bills, isLoading } = useQuery({
    queryKey: ['/api/bills'],
  });

  const { data: reminderStatus, isLoading: reminderStatusLoading } = useQuery({
    queryKey: ['/api/reminders/status'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Find bills paid through "Pay Now" that haven't been sent through Stripe Payouts yet
  const pendingBills = (Array.isArray(bills) ? bills : [])
    .filter((bill: any) => 
      bill.status === 'paid' && 
      bill.paymentType === 'real_payment' && 
      !bill.stripePayoutId
    );

  const handleTriggerPayment = async (billId: string, company: string) => {
    setTriggeringBills(prev => new Set([...prev, billId]));
    try {
      const response = await apiRequest("POST", "/api/stripe/payouts/retry-payment", {
        billId: billId
      });
      
      const result = await response.json();
      
      toast({
        title: "Payment Sent Successfully!",
        description: `Bank transfer to ${company} has been initiated. Payment will arrive within 1-3 business days.`,
      });
      
      // Refresh the data
      window.location.reload();
      
    } catch (error: any) {
      console.error("Error triggering payment:", error);
      toast({
        title: "Error Sending Payment",
        description: error.message || "Failed to trigger payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTriggeringBills(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });
    }
  };

  const handleTriggerReminders = async () => {
    setReminderProcessing(true);
    try {
      const response = await apiRequest("POST", "/api/reminders/trigger", {});
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Reminder Check Complete!",
          description: "Bill reminders have been processed and sent where needed.",
        });
      } else {
        toast({
          title: "Reminder Check Failed",
          description: result.error || "Failed to process reminders.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error triggering reminders:", error);
      toast({
        title: "Error Processing Reminders",
        description: error.message || "Failed to trigger reminder check.",
        variant: "destructive",
      });
    } finally {
      setReminderProcessing(false);
    }
  };

  const handleTestEmail = async () => {
    setTestEmailSending(true);
    try {
      const response = await apiRequest("POST", "/api/test-email", {});
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Test Email Sent! 📧",
          description: "Check your inbox for the professional email test confirmation.",
        });
      } else {
        toast({
          title: "Test Email Failed",
          description: result.error || "Failed to send test email.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast({
        title: "Error Sending Test Email",
        description: error.message || "Failed to send test email.",
        variant: "destructive",
      });
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleTestStripePayouts = async () => {
    setTestingStripePayouts(true);
    try {
      const response = await apiRequest("GET", "/api/stripe/payouts/health");
      const result = await response.json();
      
      if (result.healthy) {
        toast({
          title: "Stripe Payouts Connected! ✅",
          description: result.message || "Stripe Global Payouts API connection successful. Payment automation should work.",
        });
      } else {
        toast({
          title: "Stripe Payouts Connection Failed ❌",
          description: result.message || result.error || "Stripe Payouts API connection failed. Check credentials and logs.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error testing Stripe Payouts:", error);
      toast({
        title: "Stripe Payouts Test Error",
        description: error.message || "Failed to test Stripe Payouts connection. Check the logs.",
        variant: "destructive",
      });
    } finally {
      setTestingStripePayouts(false);
    }
  };

  const handleTestPaymentEmail = async () => {
    setTestingPaymentEmail(true);
    try {
      const response = await apiRequest("POST", "/api/test-payment-email", {});
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Payment Email Sent! 💳",
          description: "Payment confirmation test email sent. Check your inbox (or spam folder).",
        });
      } else {
        toast({
          title: "Payment Email Failed ❌",
          description: result.error || "Failed to send payment confirmation email.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error testing payment email:", error);
      toast({
        title: "Payment Email Test Error",
        description: error.message || "Failed to test payment confirmation email.",
        variant: "destructive",
      });
    } finally {
      setTestingPaymentEmail(false);
    }
  };

  const handleRetryFailedPayments = async () => {
    setRetryingFailedPayments(true);
    try {
      const response = await apiRequest("POST", "/api/stripe/payouts/retry-failed", {});
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Failed Payments Retried! 🔄",
          description: `${result.successful} payments sent, ${result.failed} failed. Checks will be mailed within 1-2 business days.`,
        });
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        toast({
          title: "Retry Failed ❌",
          description: result.error || "Failed to retry payments. Check logs.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error retrying failed payments:", error);
      toast({
        title: "Retry Error",
        description: error.message || "Failed to retry failed payments.",
        variant: "destructive",
      });
    } finally {
      setRetryingFailedPayments(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="container mx-auto p-6 pb-24">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading payments...</p>
          </div>
        </div>
        <BottomNavigation />
      </>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 pb-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">System Management</h1>
          <p className="text-muted-foreground">Manage bill reminders and payment triggers</p>
        </div>

        {/* Reminder System Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Bill Reminder System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reminderStatusLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading reminder status...
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant={reminderStatus?.isRunning ? "success" : "secondary"}>
                      {reminderStatus?.isRunning ? "Running" : "Stopped"}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Processing</div>
                    <Badge variant={reminderStatus?.isProcessing ? "destructive" : "secondary"}>
                      {reminderStatus?.isProcessing ? "Active" : "Idle"}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Check Interval</div>
                    <div className="font-medium">6 hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Next Check</div>
                    <div className="text-xs">
                      {reminderStatus?.nextCheckEstimate 
                        ? new Date(reminderStatus.nextCheckEstimate).toLocaleTimeString() 
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleTriggerReminders}
                  disabled={reminderProcessing}
                  variant="outline"
                  className="flex-1"
                >
                  {reminderProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing Reminders...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Payment
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleTestEmail}
                  disabled={testEmailSending}
                  variant="secondary"
                  className="flex-1"
                  data-testid="button-test-email"
                >
                  {testEmailSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Test...
                    </>
                  ) : (
                    <>
                      📧
                      <span className="ml-2">Test Professional Email</span>
                    </>
                  )}
                </Button>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={handleTestStripePayouts}
                  disabled={testingStripePayouts}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-test-stripe-payouts"
                >
                  {testingStripePayouts ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing API...
                    </>
                  ) : (
                    <>
                      💳
                      <span className="ml-2">Test Stripe Payouts</span>
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleTestPaymentEmail}
                  disabled={testingPaymentEmail}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-test-payment-email"
                >
                  {testingPaymentEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing Email...
                    </>
                  ) : (
                    <>
                      💳
                      <span className="ml-2">Test Payment Email</span>
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-4">
                <Button 
                  onClick={handleRetryFailedPayments}
                  disabled={retryingFailedPayments}
                  variant="default"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  data-testid="button-retry-failed-payments"
                >
                  {retryingFailedPayments ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Retrying Failed Payments...
                    </>
                  ) : (
                    <>
                      🔄
                      <span className="ml-2">Retry All Failed Payments</span>
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Automatically retry all payments that failed due to Stripe Payouts connection issues
                </p>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>• 14-day reminders: "Start preparing to pay"</p>
                <p>• 7-day reminders: "Pay now to avoid late fees"</p>
                <p>• Automatic checks run every 6 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Trigger Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Failed Payment Processing</h2>
          <p className="text-muted-foreground">Send bank transfers for bills paid through "Pay Now" that failed to process through Stripe Payouts</p>
        </div>

        {pendingBills.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Payments Processed!</h3>
                <p className="text-muted-foreground">
                  All "Pay Now" payments have been successfully sent to creditors. Future payments will be automatic.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Failed Payment Processing</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    These payments were made through "Pay Now" but failed to send to creditors via Stripe Payouts. 
                    Click "Send Payment" to retry sending each payment.
                  </p>
                </div>
              </div>
            </div>

            {pendingBills.map((bill: any) => (
              <Card key={bill.id} className="border-l-4 border-l-orange-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-orange-100 rounded-full p-2">
                        <DollarSign className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{bill.company}</h3>
                        <p className="text-sm text-muted-foreground">
                          Paid ${parseFloat((bill.paidAmount || bill.amount).toString()).toFixed(2)} on {new Date(bill.paidDate).toLocaleDateString()}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          Ready to send
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleTriggerPayment(bill.id, bill.company)}
                      disabled={triggeringBills.has(bill.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {triggeringBills.has(bill.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Check Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Future Payments</h4>
                    <p className="text-sm text-green-700 mt-1">
                      All new payments will automatically trigger Stripe bank transfers. No manual action needed!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <BottomNavigation />
    </>
  );
}