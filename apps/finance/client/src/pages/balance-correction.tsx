import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { Input } from "@finance/components/ui/input";
import { type AccountWithBalance, inferCategory } from "@finance-shared/schema";
import { apiRequest } from "@finance/lib/queryClient";
import { useToast } from "@finance/hooks/use-toast";
import { Link } from "wouter";
import { formatCurrency, getCurrencyColor, getLocalISODate } from "@finance/lib/format";
import { ArrowLeft, Save, Check } from "lucide-react";

export default function BalanceCorrection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = getLocalISODate();
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<Set<string>>(new Set());

  const { data: accounts = [], isLoading } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/finance/accounts", today],
    queryFn: async () => {
      const response = await fetch(`/api/finance/accounts?date=${today}`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json();
    },
  });

  const handleCorrectionChange = (accountId: string, value: string) => {
    setCorrections(prev => ({ ...prev, [accountId]: value }));
  };

  const getChangedAccounts = () => {
    return Object.entries(corrections).filter(([accountId, value]) => {
      if (!value || value === "") return false;
      const account = accounts.find(a => a.id === accountId);
      if (!account) return false;
      const newCents = Math.round(parseFloat(value) * 100);
      return !isNaN(newCents) && newCents !== account.currentBalanceCents;
    });
  };

  const handleSubmitAll = async () => {
    const changed = getChangedAccounts();
    if (changed.length === 0) {
      toast({ title: "No changes", description: "No balances were changed." });
      return;
    }

    setIsSubmitting(true);
    try {
      const correctionData = changed.map(([accountId, value]) => ({
        accountId,
        correctBalanceCents: Math.round(parseFloat(value) * 100),
      }));

      const response = await apiRequest("POST", "/api/finance/accounts/bulk-set-balance", {
        corrections: correctionData,
        date: today,
      });

      const result = await response.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      await queryClient.refetchQueries({ queryKey: ["/api/finance/accounts"] });

      const correctedCount = result.results?.filter((r: any) => !r.skipped).length || 0;
      const newSaved = new Set(savedAccounts);
      changed.forEach(([id]) => newSaved.add(id));
      setSavedAccounts(newSaved);
      setCorrections({});

      toast({
        title: "Balances corrected",
        description: `Updated ${correctedCount} account${correctedCount !== 1 ? 's' : ''} successfully.`,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save corrections. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const changedCount = getChangedAccounts().length;

  const getAccountCategory = (acc: AccountWithBalance) => {
    if (acc.category) return acc.category;
    return inferCategory({ type: acc.type, name: acc.name, owner: acc.owner });
  };

  const sortedAccounts = [...accounts].sort((a, b) => a.name.localeCompare(b.name));
  const grouped: Record<string, AccountWithBalance[]> = {};
  for (const acc of sortedAccounts) {
    const cat = getAccountCategory(acc);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(acc);
  }

  const categoryLabels: Record<string, string> = {
    PERSONAL: "Personal",
    SAVINGS: "Savings",
    CREDIT: "Credit",
    BUSINESS: "Business",
    INVESTMENT: "Investment",
  };

  if (isLoading) {
    return <div className="p-6">Loading accounts...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Correct Balances</h1>
            <p className="text-sm text-muted-foreground">Enter the real balance for any account that's wrong</p>
          </div>
        </div>
      </div>

      {changedCount > 0 && (
        <div className="sticky top-0 z-10 bg-background border-b pb-3 pt-2">
          <Button
            onClick={handleSubmitAll}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Saving..." : `Save ${changedCount} correction${changedCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      )}

      {Object.entries(grouped).map(([category, categoryAccounts]) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{categoryLabels[category] || category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryAccounts.map((account) => {
              const hasCorrection = corrections[account.id] !== undefined && corrections[account.id] !== "";
              const correctionValue = corrections[account.id] ?? "";
              const isChanged = hasCorrection && Math.round(parseFloat(correctionValue) * 100) !== account.currentBalanceCents;
              const justSaved = savedAccounts.has(account.id);

              return (
                <div key={account.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{account.name}</p>
                    <p className={`text-xs ${getCurrencyColor(account.currentBalanceCents)}`}>
                      Currently: {formatCurrency(account.currentBalanceCents)}
                      {justSaved && <Check className="inline h-3 w-3 ml-1 text-green-600" />}
                    </p>
                  </div>
                  <div className="w-32 flex-shrink-0">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={(account.currentBalanceCents / 100).toFixed(2)}
                        value={correctionValue}
                        onChange={(e) => handleCorrectionChange(account.id, e.target.value)}
                        className={`pl-5 text-sm h-9 ${isChanged ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-center text-muted-foreground py-4">
        Only accounts where you enter a different amount will be updated. Leave blank to keep as-is.
      </p>
    </div>
  );
}
