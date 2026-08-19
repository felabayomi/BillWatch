import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, RefreshCw, Landmark, ArrowLeft, Info, CheckCircle2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@expense/components/ui/card";
import { Button } from "@expense/components/ui/button";
import { Input } from "@expense/components/ui/input";
import { Label } from "@expense/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@expense/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@expense/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@expense/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAccountSchema, type Account } from "@expense-shared/schema";
import { apiRequest, queryClient } from "@expense/lib/queryClient";
import { useToast } from "@expense/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Accounts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fwSearchQuery, setFwSearchQuery] = useState("");

  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/expense/accounts"],
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: financeWatchData, isLoading: fwLoading, isFetching: fwFetching } = useQuery<{ accounts: string[], categories: string[] }>({
    queryKey: ["/api/expense/sync/finance-watch-data"],
  });

  const createAccount = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expense/accounts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense/accounts"] });
      toast({ title: "Account created", description: "Your account has been added." });
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      console.error("ExpenseWatch account import failed:", error);
      toast({
        title: "Account import failed",
        description: error?.message || "Could not import this FinanceWatch account.",
        variant: "destructive",
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expense/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense/accounts"] });
      toast({ title: "Account deleted" });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertAccountSchema),
    defaultValues: {
      name: "",
      type: "checking",
      financeWatchAccount: "",
      isDefault: false,
    },
  });

  const handleImport = (name: string) => {
    createAccount.mutate({
      name,
      type: "checking",
      financeWatchAccount: name,
      isDefault: false,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 flex items-center gap-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/expense")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">My Accounts</h1>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
          <CardContent className="p-4 flex gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">Account Matching with FinanceWatch</p>
              <p className="text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
                Name your accounts exactly as they appear in FinanceWatch for automatic matching. If the name doesn't match, your expenses will still sync but will land in your default checking/savings account. You can import your FinanceWatch account names below.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Your Accounts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold">Your Accounts</h2>
              </div>
              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            <div className="space-y-3">
              {accountsLoading ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)
              ) : accounts?.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground">No accounts added yet.</p>
                </div>
              ) : (
                accounts?.map((account) => (
                  <Card key={account.id} className="shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <Landmark className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-bold">{account.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteAccount.mutate(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* FinanceWatch Accounts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-5 w-5 text-indigo-600 ${fwLoading ? "animate-spin" : ""}`} />
                <h2 className="text-lg font-bold">FinanceWatch Accounts</h2>
              </div>
              <Button variant="outline" size="sm" onClick={async () => {
                setIsRefreshing(true);
                await queryClient.invalidateQueries({ queryKey: ["/api/expense/sync/finance-watch-data"] });
                await queryClient.refetchQueries({ queryKey: ["/api/expense/sync/finance-watch-data"] });
                setIsRefreshing(false);
                toast({ title: "Refreshed", description: "FinanceWatch accounts updated." });
              }} disabled={fwLoading || fwFetching || isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${fwFetching || isRefreshing ? "animate-spin" : ""}`} /> {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  These are your accounts in FinanceWatch. Click "Import" to add the exact name here so your expenses sync to the right account.
                </p>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search accounts..."
                    value={fwSearchQuery}
                    onChange={(e) => setFwSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {fwLoading ? (
                    Array(5).fill(0).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)
                  ) : !financeWatchData || !Array.isArray(financeWatchData.accounts) || financeWatchData.accounts.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No accounts found in FinanceWatch.</p>
                    </div>
                  ) : (
                    financeWatchData.accounts
                      .filter((fwAccount) => fwAccount.toLowerCase().includes(fwSearchQuery.toLowerCase()))
                      .map((fwAccount) => {
                      const isImported = accounts?.some(a => a.financeWatchAccount === fwAccount);
                      return (
                        <div key={fwAccount} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="text-sm font-semibold">{fwAccount}</p>
                          </div>
                          {isImported ? (
                            <div className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                              <CheckCircle2 className="h-3 w-3" /> Imported
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => handleImport(fwAccount)}>
                              Import
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createAccount.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Chase Checking" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="credit">Credit Card</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createAccount.isPending}>
                  {createAccount.isPending ? "Adding..." : "Add Account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
