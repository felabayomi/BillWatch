import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, RefreshCw, Download, CreditCard, Landmark, PiggyBank, Wallet, CheckCircle2, ArrowDownToLine, Info, Search } from "lucide-react";
import type { Account } from "@shared/schema";

const typeIcons: Record<string, typeof CreditCard> = {
  checking: Landmark,
  savings: PiggyBank,
  credit: CreditCard,
  credit_card: CreditCard,
  investment: Wallet,
  other: Wallet,
};

const typeColors: Record<string, string> = {
  checking: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  savings: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  credit: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  credit_card: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  investment: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function Accounts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("checking");
  const [showImport, setShowImport] = useState(false);
  const [fwSearch, setFwSearch] = useState("");

  const accountsUrl = user?.email
    ? `/api/accounts?email=${encodeURIComponent(user.email)}`
    : "/api/accounts";

  const { data: userAccounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: [accountsUrl],
    enabled: !!user,
  });

  const fwQueryUrl = user?.email
    ? `/api/finance-watch/accounts?email=${encodeURIComponent(user.email)}`
    : "/api/finance-watch/accounts";

  const { data: financeWatchData, isLoading: fwLoading, isFetching: fwFetching, refetch: refetchFW } = useQuery<{ accounts: any[]; categories: any[] }>({
    queryKey: ['/api/finance-watch/accounts', user?.email],
    queryFn: async () => {
      const res = await fetch(fwQueryUrl);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!user,
    staleTime: 0,
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; importedFromFinanceWatch?: boolean }) => {
      const res = await apiRequest("POST", "/api/accounts", { ...data, email: user?.email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [accountsUrl] });
      setNewAccountName("");
      toast({ title: "Account added" });
    },
    onError: () => {
      toast({ title: "Failed to add account", variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [accountsUrl] });
      toast({ title: "Account removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove account", variant: "destructive" });
    },
  });

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    createAccountMutation.mutate({ name: newAccountName.trim(), type: newAccountType });
  };

  const handleImportAccount = (accountName: string, accountType: string) => {
    const alreadyExists = userAccounts.some(
      (a) => a.name.toLowerCase() === accountName.toLowerCase()
    );
    if (alreadyExists) {
      toast({ title: "Already added", description: `"${accountName}" is already in your accounts.` });
      return;
    }
    createAccountMutation.mutate({ name: accountName, type: accountType || "checking", importedFromFinanceWatch: true });
  };

  const handleImportAll = () => {
    const unimported = fwAccounts.filter(
      (fw) => !userAccounts.some((a) => a.name.toLowerCase() === fw.name.toLowerCase())
    );
    if (unimported.length === 0) {
      toast({ title: "All accounts already imported" });
      return;
    }
    unimported.forEach((fw) => {
      createAccountMutation.mutate({ name: fw.name, type: fw.type || "checking", importedFromFinanceWatch: true });
    });
  };

  const fwAccounts: Array<{ name: string; type: string }> = (financeWatchData?.accounts || []).map((a: any) => ({
    name: typeof a === "string" ? a : (a.name || a.accountName || ""),
    type: typeof a === "string" ? "checking" : (a.type || "checking"),
  })).filter((a: any) => a.name.trim());

  const unimportedCount = fwAccounts.filter(
    (fw) => !userAccounts.some((a) => a.name.toLowerCase() === fw.name.toLowerCase())
  ).length;

  return (
    <Layout>
      <div className="px-4 py-5 pb-24 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Payment Accounts</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {userAccounts.length} account{userAccounts.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Account Matching with FinanceWatch</p>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Name your accounts exactly as they appear in FinanceWatch for automatic matching. If the name doesn't match, your expenses will still sync but will land in your default checking/savings account. You can import your FinanceWatch account names below.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add account name..."
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
              className="flex-1 h-11"
            />
            <Select value={newAccountType} onValueChange={setNewAccountType}>
              <SelectTrigger className="w-[110px] h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="icon"
              className="h-11 w-11 flex-shrink-0"
              onClick={handleAddAccount}
              disabled={!newAccountName.trim() || createAccountMutation.isPending}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {accountsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : userAccounts.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <Landmark className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">No accounts yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Add an account above or import from FinanceWatch below</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {userAccounts.map((account) => {
              const accountType = account.type || "other";
              const Icon = typeIcons[accountType] || Wallet;
              const colorClass = typeColors[accountType] || typeColors.other;
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border shadow-sm"
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{account.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {accountType.replace("_", " ")}
                      {account.importedFromFinanceWatch && (
                        <span className="ml-1 text-blue-500">· synced</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0"
                    onClick={() => deleteAccountMutation.mutate(account.id)}
                    disabled={deleteAccountMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t pt-5">
          <button
            onClick={() => setShowImport(!showImport)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200 dark:border-blue-800 rounded-xl transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <ArrowDownToLine className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Import from FinanceWatch</p>
                <p className="text-xs text-muted-foreground">
                  {fwLoading ? "Loading..." : `${fwAccounts.length} accounts available${unimportedCount > 0 ? ` · ${unimportedCount} new` : ""}`}
                </p>
              </div>
            </div>
            <div className={`text-muted-foreground transition-transform ${showImport ? "rotate-180" : ""}`}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </button>

          {showImport && (
            <div className="mt-3 space-y-3">
              {fwLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : fwAccounts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No FinanceWatch accounts found</p>
                  <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => refetchFW()}>
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search FinanceWatch accounts..."
                      value={fwSearch}
                      onChange={(e) => setFwSearch(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchFW()}
                      disabled={fwFetching}
                      className="gap-1.5 text-xs"
                    >
                      <RefreshCw className={`h-3 w-3 ${fwFetching ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    {unimportedCount > 0 && (
                      <Button
                        size="sm"
                        onClick={handleImportAll}
                        disabled={createAccountMutation.isPending}
                        className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className="h-3 w-3" />
                        Import All ({unimportedCount})
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {fwAccounts.filter((fw) => fw.name.toLowerCase().includes(fwSearch.toLowerCase())).map((fwAcc, idx) => {
                      const alreadyImported = userAccounts.some(
                        (a) => a.name.toLowerCase() === fwAcc.name.toLowerCase()
                      );
                      const Icon = typeIcons[fwAcc.type] || Wallet;
                      const colorClass = typeColors[fwAcc.type] || typeColors.other;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            alreadyImported
                              ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                              : "bg-card hover:shadow-sm"
                          }`}
                        >
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{fwAcc.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{fwAcc.type}</p>
                          </div>
                          {alreadyImported ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 flex-shrink-0">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs font-medium">Added</span>
                            </div>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleImportAccount(fwAcc.name, fwAcc.type)}
                              disabled={createAccountMutation.isPending}
                              className="flex-shrink-0 gap-1 h-8 bg-blue-600 hover:bg-blue-700 text-xs"
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="text-xs text-center text-muted-foreground/60 px-4">
                Matching account names ensures your paid bills sync to the correct FinanceWatch account automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
