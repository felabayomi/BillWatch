import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BillComPaymentForm } from "../components/BillComPaymentForm";

export function Payment() {
  const [, setLocation] = useLocation();
  const [billId, setBillId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const bill = urlParams.get("billId");
    const amt = urlParams.get("amount");
    const comp = urlParams.get("company");
    const acct = urlParams.get("accountNumber");

    if (bill && amt && comp) {
      setBillId(bill);
      setAmount(amt);
      setCompany(decodeURIComponent(comp));
      setAccountNumber(acct ? decodeURIComponent(acct) : "");
      setIsLoading(false);
    } else {
      // Invalid parameters, redirect back
      setLocation("/");
    }
  }, [setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handlePaymentSuccess = () => {
    setLocation(`/payment-success?company=${encodeURIComponent(company)}&amount=${amount}&provider=billcom`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto pt-8 px-4">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="p-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold ml-2">Pay Bill - {company}</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <BillComPaymentForm
            billId={billId}
            amount={amount}
            company={company}
            accountNumber={accountNumber}
            onSuccess={handlePaymentSuccess}
          />
        </div>
      </div>
    </div>
  );
}