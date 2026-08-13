import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ExternalLink, Shield, Building2, Clock, CheckCircle } from "lucide-react";

interface BillComPaymentFormProps {
  billId: string;
  amount: string;
  company: string;
  accountNumber?: string;
  onSuccess: () => void;
}

export function BillComPaymentForm({ 
  billId, 
  amount, 
  company, 
  accountNumber, 
  onSuccess 
}: BillComPaymentFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      console.log("🏦 Creating BILL.com payment flow for bill:", billId);

      const response = await apiRequest("POST", `/api/bills/pay-via-billcom/${billId}`);
      const paymentData = await response.json();

      if (response.ok && paymentData.success) {
        console.log("✅ BILL.com payment flow created:", paymentData);
        console.log("🔗 Redirecting to:", paymentData.paymentUrl);

        toast({
          title: "Payment Portal Created",
          description: paymentData.message,
          variant: "default"
        });

        // Small delay then redirect to BILL.com payment portal
        setTimeout(() => {
          // For mock URLs in development, just simulate success
          if (paymentData.paymentUrl.includes('mock-billcom-payment.com')) {
            console.log('🧪 Mock payment detected - simulating success');
            onSuccess();
            return;
          }
          window.location.href = paymentData.paymentUrl;
        }, 1500);

      } else {
        throw new Error(paymentData.error || "Failed to create payment");
      }
    } catch (error: any) {
      console.error("❌ BILL.com payment creation failed:", error);
      
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Unable to create payment portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Method Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Building2 className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900">BILL.com Payment Portal</h3>
            <p className="text-sm text-blue-700 mt-1">
              You'll be redirected to a secure payment portal where you can pay using:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Bank account (ACH) - lower fees</li>
              <li>• Debit or credit card</li>
              <li>• Digital wallet options</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bill Details */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Company:</span>
            <span className="font-medium">{company}</span>
          </div>
          {accountNumber && (
            <div className="flex justify-between">
              <span className="text-gray-600">Account:</span>
              <span className="font-medium">{accountNumber}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="text-gray-600">Amount:</span>
            <span className="font-bold text-lg text-green-600">${parseFloat(amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Process Flow */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          What happens next:
        </h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>1. Secure payment portal opens</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>2. Choose your payment method</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>3. Payment sent directly to {company}</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>4. Instant confirmation & tracking</span>
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Shield className="h-4 w-4" />
        <span>Bank-level security with end-to-end encryption</span>
      </div>

      {/* Pay Button */}
      <Button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
        size="lg"
        data-testid="button-pay-billcom"
      >
        {isLoading ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Creating Payment Portal...
          </>
        ) : (
          <>
            <ExternalLink className="h-4 w-4 mr-2" />
            Pay ${parseFloat(amount).toFixed(2)} via BILL.com
          </>
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        By clicking "Pay", you'll be redirected to BILL.com's secure payment portal.
        You'll return to BillWatch after completing your payment.
      </p>
    </div>
  );
}