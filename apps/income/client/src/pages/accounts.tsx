import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { useToast } from "@income/hooks/use-toast";
import type { UserAccount } from "@income/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";
import { Input } from "@income/components/ui/input";
import { Label } from "@income/components/ui/label";
import { Badge } from "@income/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@income/components/ui/select";
import { Wallet, Plus, Trash2, Star, ArrowLeft, RefreshCw, Info, ExternalLink, Search } from "lucide-react";
import Footer from "@income/components/footer";
import MobileNav from "@income/components/mobile-nav";
import { useIsMobile } from "@income/hooks/use-mobile";

interface FinanceWatchAccount {
  name: string;
  type?: string;
}

export default function AccountsPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("checking");
  const [showForm, setShowForm] = useState(false);
  const [fwSearch, setFwSearch] = useState("");

  const { data: accounts = [], isLoading } = useQuery<UserAccount[]>({
    queryKey: ["/api/income-lift/accounts"],
  });

  const { data: fwData, isLoading: fwLoading, refetch: refetchFW } = useQuery<{ accounts: any[]; categories: any[] }>({
    queryKey: ["/api/income-lift/accounts/financewatch"],
    staleTime: 5 * 60 * 1000,
  });

  const fwAccounts: FinanceWatchAccount[] = (fwData?.accounts || []).map((a: any) => ({
    name: typeof a === "string" ? a : a?.name || String(a),
    type: typeof a === "object" ? a?.type : undefined,
  }));

  const createMutation = useMutation({
    mutationFn: (data: { name: string; type: string; isDefault: boolean }) =>
      apiRequest("POST", "/api/income-lift/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income-lift/accounts"] });
      setNewName("");
      setNewType("checking");
      setShowForm(false);
      toast({ title: "Account created", description: "Your new account has been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create account.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/income-lift/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income-lift/accounts"] });
      toast({ title: "Account removed" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/income-lift/accounts/${id}/default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income-lift/accounts"] });
      toast({ title: "Default account updated" });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      type: newType,
      isDefault: accounts.length === 0,
    });
  };

  const handleImportFromFW = (fwAccount: FinanceWatchAccount) => {
    const exists = accounts.some(
      (a) => a.name.toLowerCase() === fwAccount.name.toLowerCase()
    );
    if (exists) {
      toast({
        title: "Already exists",
        description: `"${fwAccount.name}" is already in your accounts.`,
      });
      return;
    }
    createMutation.mutate({
      name: fwAccount.name,
      type: fwAccount.type || "checking",
      isDefault: accounts.length === 0,
    });
  };

  const accountTypes = [
    { value: "checking", label: "Checking" },
    { value: "savings", label: "Savings" },
    { value: "cash", label: "Cash" },
    { value: "business", label: "Business" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      <div className={`container mx-auto px-4 py-6 space-y-6 ${isMobile ? "mobile-nav-padding" : ""}`}>
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => (window.location.href = "/income")}>
            <ArrowLeft size={20} />
          </Button>
          <Wallet className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold">My Accounts</h1>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Account Matching with FinanceWatch
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Name your accounts exactly as they appear in FinanceWatch for automatic matching.
                If the name doesn't match, your income will still sync but will land in your default
                checking/savings account. You can import your FinanceWatch account names below.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wallet size={20} className="text-green-600" />
                  Your Accounts
                </span>
                <Button size="sm" onClick={() => setShowForm(!showForm)}>
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showForm && (
                <form onSubmit={handleCreate} className="mb-4 p-4 bg-muted rounded-lg space-y-3">
                  <div>
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input
                      id="account-name"
                      placeholder="e.g. Chase Checking 8915"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Account Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Account"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {isLoading ? (
                <p className="text-muted-foreground text-sm">Loading accounts...</p>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="mx-auto mb-3 opacity-50" size={40} />
                  <p className="text-sm">No accounts yet. Add one or import from FinanceWatch.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 bg-card border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {account.isDefault && (
                          <Star size={16} className="text-yellow-500 fill-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!account.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDefaultMutation.mutate(account.id)}
                            title="Set as default"
                          >
                            <Star size={16} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(account.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove account"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ExternalLink size={20} className="text-indigo-600" />
                  FinanceWatch Accounts
                </span>
                <Button variant="outline" size="sm" onClick={() => refetchFW()}>
                  <RefreshCw size={14} className="mr-1" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                These are your accounts in FinanceWatch. Click "Import" to add the exact name here
                so your income syncs to the right account.
              </p>
              {fwLoading ? (
                <p className="text-muted-foreground text-sm">Loading FinanceWatch accounts...</p>
              ) : fwAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No FinanceWatch accounts found. Make sure you have accounts set up there.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search accounts..."
                      value={fwSearch}
                      onChange={(e) => setFwSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {fwAccounts
                    .filter((fwa) =>
                      fwa.name.toLowerCase().includes(fwSearch.toLowerCase())
                    )
                    .map((fwa, i) => {
                      const alreadyImported = accounts.some(
                        (a) => a.name.toLowerCase() === fwa.name.toLowerCase()
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-card border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{fwa.name}</p>
                            {fwa.type && (
                              <p className="text-xs text-muted-foreground capitalize">{fwa.type}</p>
                            )}
                          </div>
                          {alreadyImported ? (
                            <Badge variant="secondary" className="text-xs">Imported</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImportFromFW(fwa)}
                              disabled={createMutation.isPending}
                            >
                              Import
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  {fwAccounts.filter((fwa) =>
                    fwa.name.toLowerCase().includes(fwSearch.toLowerCase())
                  ).length === 0 && fwSearch && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No accounts matching "{fwSearch}"
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Footer />
      </div>
      {isMobile && <MobileNav />}
    </div>
  );
}



