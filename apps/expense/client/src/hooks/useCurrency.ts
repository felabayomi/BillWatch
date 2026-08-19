import { useQuery } from "@tanstack/react-query";
import { CURRENCIES, type CurrencyCode } from "@expense-shared/schema";

export function useCurrency() {
  const { data: user } = useQuery<{ currency: string }>({ queryKey: ["/api/auth/user"] });
  const currencyCode = (user?.currency || "USD") as CurrencyCode;
  const currency = CURRENCIES[currencyCode];

  const formatAmount = (amount: number | string): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    
    // Format with 2 decimal places and thousands separator
    const formatted = numAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return `${currency.symbol}${formatted}`;
  };

  return {
    currency,
    currencyCode,
    formatAmount,
  };
}
