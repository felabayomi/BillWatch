import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Shield } from "lucide-react";

interface StripePaymentFormProps {
  billId: string;
  amount: string;
  onSuccess: () => void;
}

export function StripePaymentForm({ billId, amount, onSuccess }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (stripe && elements) {
      setIsReady(true);
    }
  }, [stripe, elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/payment-success",
        },
        redirect: "if_required",
      });

      if (error) {
        console.error("Payment failed:", error);
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment succeeded, update the bill
        try {
          await apiRequest("POST", "/api/payments/confirm", {
            paymentIntentId: paymentIntent.id,
            billId,
            actualAmount: amount,
          });

          toast({
            title: "Payment Successful!",
            description: `Payment of $${parseFloat(amount).toFixed(2)} completed successfully.`,
          });

          // Call the success callback
          onSuccess();
        } catch (confirmError) {
          console.error("Error confirming payment:", confirmError);
          toast({
            title: "Payment Processed",
            description: "Payment was successful, but there was an issue updating the bill. Please contact support.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
        <span className="ml-2 text-sm text-gray-600">Loading payment form...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="stripe-payment-form">
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Shield className="h-4 w-4" />
          <span>Secured by Stripe</span>
        </div>

        <PaymentElement 
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card", "us_bank_account"],
          }}
        />

        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Payment Methods Accepted:</h4>
          <div className="flex items-center space-x-4 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <CreditCard className="h-3 w-3" />
              <span>Credit & Debit Cards</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🏦</span>
              <span>Bank Accounts</span>
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full"
        size="lg"
        data-testid="button-complete-payment"
      >
        {isLoading ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Pay ${parseFloat(amount).toFixed(2)}
          </>
        )}
      </Button>

      <div className="text-xs text-gray-500 text-center">
        Your payment information is secure and encrypted. 
        <br />
        You will be charged ${parseFloat(amount).toFixed(2)} immediately.
      </div>
    </form>
  );
}