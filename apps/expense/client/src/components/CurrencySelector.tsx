import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@expense/components/ui/select";
import { apiRequest, queryClient } from "@expense/lib/queryClient";
import { CURRENCIES, type CurrencyCode } from "@expense-shared/schema";
import { useToast } from "@expense/hooks/use-toast";

export function CurrencySelector() {
  const { toast } = useToast();
  const { data: user } = useQuery<{ currency: string }>({ queryKey: ["/api/auth/user"] });
  
  const updateCurrency = useMutation({
    mutationFn: async (currency: string) => {
      return await apiRequest("PATCH", "/api/expense/user/currency", { currency });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expense/expenses"] });
      toast({
        title: "Currency updated",
        description: "Your currency preference has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update currency. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentCurrency = (user?.currency || "USD") as CurrencyCode;
  const currency = CURRENCIES[currentCurrency];

  return (
    <Select
      value={currentCurrency}
      onValueChange={(value) => updateCurrency.mutate(value)}
      disabled={updateCurrency.isPending}
    >
      <SelectTrigger 
        className="w-[90px] h-9 text-xs font-medium border-none bg-muted/50 hover:bg-muted focus:ring-1"
        data-testid="select-currency"
      >
        <SelectValue>
          <span className="flex items-center gap-1">
            <span>{currency.symbol}</span>
            <span className="text-[10px] text-muted-foreground">{currency.code}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="max-h-[300px]">
        {Object.entries(CURRENCIES).map(([code, curr]) => (
          <SelectItem key={code} value={code}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{curr.symbol}</span>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">{curr.code}</span>
                <span className="text-[10px] text-muted-foreground">{curr.name}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
