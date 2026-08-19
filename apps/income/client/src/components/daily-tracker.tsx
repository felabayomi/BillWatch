import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { useToast } from "@income/hooks/use-toast";
import type { IncomeEntry, UserAccount } from "@income/lib/types";
import { Card, CardContent } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";
import { Input } from "@income/components/ui/input";
import { Textarea } from "@income/components/ui/textarea";
import { Label } from "@income/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@income/components/ui/select";
import { Trophy, Wallet } from "lucide-react";

interface DailyTrackerProps {
  todaysTotal: number;
  dailyGoal: number;
}

export default function DailyTracker({ todaysTotal, dailyGoal }: DailyTrackerProps) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("wages");
  const [notes, setNotes] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery<UserAccount[]>({
    queryKey: ["/api/income-lift/accounts"],
  });

  const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];
  const activeAccountId = selectedAccountId || defaultAccount?.id || "";

  // Get user's timezone for consistent "today" calculation
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const { data: todaysEntries = [] } = useQuery<IncomeEntry[]>({
    queryKey: ['/api/income-lift/income/today', userTimezone],
    queryFn: () => fetch(`/api/income-lift/income/today?timezone=${encodeURIComponent(userTimezone)}`).then(res => res.json()),
    staleTime: 0,
  });

  const addIncomeMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/income-lift/income', data),
    onSuccess: () => {
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/income'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/income/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/income/week'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/income/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/level/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/user'] });
      window.dispatchEvent(new CustomEvent("financewatch:refresh"));

      setAmount("");
      setNotes("");
      toast({
        title: "Income logged successfully!",
        description: "Your daily progress has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log income. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount === 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    if (parsedAmount < 0 && source !== "portfolio") {
      toast({
        title: "Negative amount not allowed",
        description: "Only Portfolio entries can have negative amounts (realized losses).",
        variant: "destructive",
      });
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === activeAccountId);
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    addIncomeMutation.mutate({
      amount: parsedAmount.toFixed(2),
      source,
      notes,
      date: localDate,
      accountName: selectedAccount?.name,
    });
  };

  const sourcesData = [
    { id: "wages", label: "Wages" },
    { id: "side_hustle", label: "Side Hustle" },
    { id: "portfolio", label: "Portfolio" },
    { id: "services", label: "Services" },
  ];

  // Calculate actual today's total from entries to ensure accuracy
  const actualTodaysTotal = todaysEntries.reduce((sum: number, entry: IncomeEntry) => sum + parseFloat(entry.amount), 0);
  
  const progressPercent = dailyGoal > 0 ? Math.min((actualTodaysTotal / dailyGoal) * 100, 150) : 0;
  const difference = actualTodaysTotal - dailyGoal;

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Daily Income Tracker</h3>
          <div className="text-sm text-muted-foreground">
            Today: <span className="font-medium text-foreground">{formatDate()}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="amount">{source === "portfolio" ? "Amount (use negative for realized loss)" : "What did you earn today?"}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder={source === "portfolio" ? "-0.00 or 0.00" : "0.00"}
                    className="pl-8"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="input-daily-amount"
                  />
                </div>
                {source === "portfolio" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a negative amount for realized losses, positive for gains.
                  </p>
                )}
              </div>
              
              <div>
                <Label>Income Source</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {sourcesData.map((sourceOption) => (
                    <Button
                      key={sourceOption.id}
                      type="button"
                      variant={source === sourceOption.id ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setSource(sourceOption.id)}
                      data-testid={`button-source-${sourceOption.id}`}
                    >
                      {sourceOption.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Quick Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Hours worked, method of payment, etc."
                  className="resize-none"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="textarea-notes"
                />
              </div>

              <div>
                <Label className="flex items-center gap-1.5">
                  <Wallet size={14} />
                  Deposit To
                </Label>
                {accounts.length > 0 ? (
                  <Select value={activeAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acct) => (
                        <SelectItem key={acct.id} value={acct.id}>
                          {acct.name} {acct.isDefault ? "(Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <a
                    href="/income/accounts"
                    className="mt-1 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    + Set up accounts for FinanceWatch syncing
                  </a>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={addIncomeMutation.isPending}
                data-testid="button-log-income"
              >
                {addIncomeMutation.isPending ? "Logging..." : "Log Income"}
              </Button>
            </form>
          </div>
          
          {/* Today's Summary */}
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium mb-3">Today's Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Earned:</span>
                  <span className="font-medium" data-testid="text-todays-total">${actualTodaysTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Daily Goal:</span>
                  <span className="font-medium" data-testid="text-daily-goal">${dailyGoal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Difference:</span>
                  <span className={`font-medium ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-daily-difference">
                    {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-background rounded-full h-2 relative">
                  <div 
                    className={`h-2 rounded-full progress-bar ${progressPercent >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                    style={{width: `${Math.min(progressPercent, 100)}%`}}
                  ></div>
                  {/* Overflow indicator for exceeding 100% */}
                  {progressPercent > 100 && (
                    <div className="absolute right-0 top-0 h-2 w-1 bg-yellow-400 rounded-r-full animate-pulse"></div>
                  )}
                </div>
                <p className={`text-xs mt-1 font-medium ${progressPercent >= 100 ? 'text-green-600' : 'text-muted-foreground'}`} data-testid="text-progress-percent">
                  {progressPercent >= 100 ? (
                    `🎯 ${progressPercent.toFixed(0)}% of daily goal achieved! `
                  ) : (
                    `${progressPercent.toFixed(0)}% of daily goal achieved`
                  )}
                </p>
              </div>
            </div>
            
            {difference > 0 && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Trophy className="text-green-600 dark:text-green-400 mr-2" size={16} />
                  <span className="font-medium text-green-800 dark:text-green-200">
                    {progressPercent >= 150 ? "Outstanding!" : progressPercent >= 120 ? "Exceptional!" : "Great job!"}
                  </span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You exceeded your daily goal by ${difference.toFixed(2)} ({Math.round((actualTodaysTotal / dailyGoal) * 100)}%). 
                  Keep this momentum to stay ahead of your weekly target!
                </p>
              </div>
            )}

            {todaysEntries.length > 0 && (
              <div className="bg-secondary rounded-lg p-4">
                <h4 className="font-medium mb-3">Today's Entries ({todaysEntries.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {todaysEntries.map((entry: IncomeEntry, index: number) => {
                    const entryAmount = parseFloat(entry.amount);
                    return (
                      <div key={entry.id} className="flex justify-between text-sm">
                        <span className="capitalize">{entry.source.replace('_', ' ')}</span>
                        <span className={`font-medium ${entryAmount < 0 ? 'text-red-600' : ''}`}>
                          {entryAmount < 0 ? `-$${Math.abs(entryAmount).toFixed(2)}` : `$${entryAmount.toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




