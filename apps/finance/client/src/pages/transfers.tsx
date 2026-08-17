import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransferForm } from "@/components/transfer-form";
import { CreditCardPaymentForm } from "@/components/credit-card-payment-form";
import { ExpenseForm } from "@/components/expense-form";
import { BillPaymentForm } from "@/components/bill-payment-form";
import { IncomeForm } from "@/components/income-form";
import { EditTransactionForm } from "@/components/edit-transaction-form";
import { EditTransferForm } from "@/components/edit-transfer-form";
import { InvestmentForm } from "@/components/investment-form";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { type TransactionWithDetails, type AccountWithBalance } from "@shared/schema";
import { Plus, ArrowRight, Home, ShoppingCart, Receipt, TrendingUp, Landmark, Pencil, Trash2, CreditCard, Search, X, Calendar, ChevronDown, FileText, Eye, EyeOff, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getLocalISODate } from "@/lib/format";

export default function Transfers() {
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showCreditCardPaymentForm, setShowCreditCardPaymentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showBillPaymentForm, setShowBillPaymentForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showInvestmentForm, setShowInvestmentForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEditTransferForm, setShowEditTransferForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);
  const [editingFromTransaction, setEditingFromTransaction] = useState<TransactionWithDetails | null>(null);
  const [editingToTransaction, setEditingToTransaction] = useState<TransactionWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");

  const today = getLocalISODate();

  const handleEditTransaction = (transaction: TransactionWithDetails) => {
    setEditingTransaction(transaction);
    setShowEditForm(true);
  };

  const handleEditTransfer = (fromTx: TransactionWithDetails, toTx: TransactionWithDetails) => {
    setEditingFromTransaction(fromTx);
    setEditingToTransaction(toTx);
    setShowEditTransferForm(true);
  };

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteTransferMutation = useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: string; toId: string }) => {
      await apiRequest("DELETE", `/api/transactions/${fromId}`);
      await apiRequest("DELETE", `/api/transactions/${toId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-balances"] });
      toast({ title: "Transfer deleted", description: "The transfer has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete transfer.", variant: "destructive" });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-balances"] });
      toast({ title: "Transaction deleted", description: "The transaction has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete transaction.", variant: "destructive" });
    },
  });

  const handleDeleteTransfer = (fromTx: TransactionWithDetails, toTx: TransactionWithDetails) => {
    if (confirm("Are you sure you want to delete this transfer?")) {
      deleteTransferMutation.mutate({ fromId: fromTx.id, toId: toTx.id });
    }
  };

  const handleDeleteTransaction = (tx: TransactionWithDetails) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransactionMutation.mutate(tx.id);
    }
  };

  const { data: accounts = [] } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts", { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch accounts');
      return response.json();
    },
  });

  const liabilityTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];
  const assetAccounts = accounts.filter(a => !liabilityTypes.includes(a.type));
  const liabilityAccounts = accounts.filter(a => liabilityTypes.includes(a.type));
  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.currentBalanceCents, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.currentBalanceCents, 0);

  // Fetch all transactions to filter for transfers
  const { data: allTransactions = [], isLoading } = useQuery<TransactionWithDetails[]>({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
  });

  // Filter and group transfers
  const transfers = allTransactions.filter(t => t.transferId);
  const transferGroups = new Map<string, TransactionWithDetails[]>();

  transfers.forEach(transfer => {
    if (!transfer.transferId) return;
    
    if (!transferGroups.has(transfer.transferId)) {
      transferGroups.set(transfer.transferId, []);
    }
    transferGroups.get(transfer.transferId)!.push(transfer);
  });

  // Convert to array and sort by date (newest first)
  const transferPairs = Array.from(transferGroups.values())
    .filter(group => group.length === 2) // Only complete transfers
    .sort((a, b) => {
      const dateDiff = new Date(b[0].txDate).getTime() - new Date(a[0].txDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b[0].createdAt || 0).getTime() - new Date(a[0].createdAt || 0).getTime();
    });

  // Detect credit card payment pairs first (needed to exclude from bills)
  const creditCardTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];

  const isCreditCardPaymentPair = (pair: TransactionWithDetails[]) => {
    const hasLiabilityAccount = pair.some(t => creditCardTypes.includes(t.accountType || ''));
    const hasNonLiabilityAccount = pair.some(t => !creditCardTypes.includes(t.accountType || ''));
    const hasBillCategory = pair.some(t => t.categoryKind === 'bill' || t.categoryKind === 'debt');
    return hasLiabilityAccount && hasNonLiabilityAccount && hasBillCategory;
  };

  const creditCardPaymentPairs = transferPairs.filter(isCreditCardPaymentPair);

  const creditCardPaymentTransferIds = new Set(
    creditCardPaymentPairs.flatMap(pair => pair.map(t => t.transferId)).filter(Boolean)
  );

  const regularTransferPairs = transferPairs.filter(pair => !isCreditCardPaymentPair(pair));

  // Filter transactions by type (excluding transfers)
  const nonTransferTransactions = allTransactions.filter(t => !t.transferId);
  
  const sortNewestFirst = (a: TransactionWithDetails, b: TransactionWithDetails) => {
    const dateDiff = new Date(b.txDate).getTime() - new Date(a.txDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  };

  // Get expense transactions (negative amounts, expense categories)
  const expenses = nonTransferTransactions
    .filter(t => t.amountCents < 0 && t.categoryKind === 'expense')
    .sort(sortNewestFirst);

  // Get bill payment transactions (negative amounts, bill categories - excluding credit card payments which show in CC tab)
  const billPayments = allTransactions
    .filter(t => t.amountCents < 0 && t.categoryKind === 'bill' && !creditCardPaymentTransferIds.has(t.transferId))
    .sort(sortNewestFirst);

  // Get income transactions (positive amounts, income categories)
  const incomeTransactions = nonTransferTransactions
    .filter(t => t.amountCents > 0 && t.categoryKind === 'income')
    .sort(sortNewestFirst);

  // Get investment transactions
  const investmentTransactions = nonTransferTransactions
    .filter(t => t.categoryKind === 'investment')
    .sort(sortNewestFirst);

  const searchLower = searchQuery.toLowerCase();

  const matchesDateFilter = (txDate: string) => {
    if (!dateFilter) return true;
    return txDate === dateFilter;
  };

  const matchesPairSearch = (pair: TransactionWithDetails[]) => {
    if (!matchesDateFilter(pair[0].txDate)) return false;
    if (!searchQuery) return true;
    return pair.some(t =>
      (t.description?.toLowerCase().includes(searchLower)) ||
      (t.accountName?.toLowerCase().includes(searchLower)) ||
      (t.categoryName?.toLowerCase().includes(searchLower)) ||
      formatCurrency(Math.abs(t.amountCents)).toLowerCase().includes(searchLower)
    );
  };

  const matchesTxSearch = (t: TransactionWithDetails) => {
    if (!matchesDateFilter(t.txDate)) return false;
    if (!searchQuery) return true;
    return (
      (t.description?.toLowerCase().includes(searchLower)) ||
      (t.accountName?.toLowerCase().includes(searchLower)) ||
      (t.categoryName?.toLowerCase().includes(searchLower)) ||
      formatCurrency(Math.abs(t.amountCents)).toLowerCase().includes(searchLower)
    );
  };

  const filteredRegularTransferPairs = regularTransferPairs.filter(matchesPairSearch);
  const filteredCreditCardPaymentPairs = creditCardPaymentPairs.filter(matchesPairSearch);
  const filteredExpenses = expenses.filter(matchesTxSearch);
  const filteredBillPayments = billPayments.filter(matchesTxSearch);
  const filteredIncomeTransactions = incomeTransactions.filter(matchesTxSearch);
  const filteredInvestmentTransactions = investmentTransactions.filter(matchesTxSearch);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financial Transactions</h2>
          <p className="text-muted-foreground">Manage transfers, expenses, bills, and income</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2" data-testid="button-back-dashboard">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link to="/accounts">
            <Button variant="outline" className="flex items-center gap-2" data-testid="button-back-accounts">
              <Landmark className="h-4 w-4" />
              Accounts
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar + Date Filter + New Transaction */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10 w-[200px]"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter("")} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <Popover open={showNewMenu} onOpenChange={setShowNewMenu}>
            <PopoverTrigger asChild>
              <Button className="flex items-center gap-1.5 whitespace-nowrap">
                <Plus className="h-4 w-4" />
                New
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-2">
              <div className="flex flex-col gap-1">
                {dateFilter && (
                  <>
                    <p className="text-xs text-muted-foreground px-2 py-1">
                      Date: {formatShortDate(dateFilter)}
                    </p>
                    <button
                      onClick={() => { setShowNewMenu(false); }}
                      className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-primary/10 text-primary font-medium text-left"
                    >
                      <Search className="h-4 w-4" />
                      Search {formatShortDate(dateFilter)}
                    </button>
                    <div className="border-b my-1" />
                  </>
                )}
                <button
                  onClick={() => { setShowTransferForm(true); setShowNewMenu(false); }}
                  className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-accent text-left"
                >
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Transfer
                </button>
                <button
                  onClick={() => { setShowCreditCardPaymentForm(true); setShowNewMenu(false); }}
                  className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-accent text-left"
                >
                  <CreditCard className="h-4 w-4 text-violet-600" />
                  CC Payment
                </button>
                <button
                  onClick={() => { setShowExpenseForm(true); setShowNewMenu(false); }}
                  className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-accent text-left"
                >
                  <ShoppingCart className="h-4 w-4 text-red-600" />
                  Expense
                </button>
                <button
                  onClick={() => { setShowBillPaymentForm(true); setShowNewMenu(false); }}
                  className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-accent text-left"
                >
                  <Receipt className="h-4 w-4 text-orange-600" />
                  Bill Payment
                </button>
                <button
                  onClick={() => { setShowIncomeForm(true); setShowNewMenu(false); }}
                  className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-accent text-left"
                >
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Income
                </button>
                <button
                  onClick={() => { setShowInvestmentForm(true); setShowNewMenu(false); }}
                  className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-md hover:bg-accent text-left"
                >
                  <Landmark className="h-4 w-4 text-indigo-600" />
                  Investment
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Account Balances Toggle */}
      <div className="space-y-2">
        <button
          onClick={() => setShowBalances(!showBalances)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showBalances ? "Hide" : "Show"} Account Balances
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{accounts.length}</span>
        </button>

        {showBalances && accounts.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total Assets</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalAssets)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total Liabilities</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totalLiabilities)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Net Worth</p>
                <p className={`text-lg font-bold ${totalAssets + totalLiabilities >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalAssets + totalLiabilities)}
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="pl-10 pr-10"
              />
              {accountSearch && (
                <button onClick={() => setAccountSearch("")} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
              {accounts
                .filter(a => !accountSearch || a.name.toLowerCase().includes(accountSearch.toLowerCase()) || a.type.toLowerCase().includes(accountSearch.toLowerCase()))
                .map(account => {
                  const isLiability = liabilityTypes.includes(account.type);
                  return (
                    <div key={account.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isLiability ? <CreditCard className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <Wallet className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                        <span className="text-sm truncate">{account.name}</span>
                      </div>
                      <span className={`text-sm font-semibold flex-shrink-0 ml-2 ${isLiability ? 'text-red-600' : account.currentBalanceCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(account.currentBalanceCents)}
                      </span>
                    </div>
                  );
                })}
              {accounts.length > 0 && accounts.filter(a => !accountSearch || a.name.toLowerCase().includes(accountSearch.toLowerCase()) || a.type.toLowerCase().includes(accountSearch.toLowerCase())).length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-2">No accounts match "{accountSearch}"</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Tabs */}
      <Tabs defaultValue="transfers" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="transfers" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-3" data-testid="tab-transfers">
            <ArrowRight className="h-4 w-4" />
            <span className="hidden sm:inline">Transfers</span>
          </TabsTrigger>
          <TabsTrigger value="cc-payments" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-3" data-testid="tab-cc-payments">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">CC Pay</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-3" data-testid="tab-expenses">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="bills" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-3" data-testid="tab-bills">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Bills</span>
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-3" data-testid="tab-income">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Income</span>
          </TabsTrigger>
          <TabsTrigger value="investments" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-3" data-testid="tab-investments">
            <Landmark className="h-4 w-4" />
            <span className="hidden sm:inline">Invest</span>
          </TabsTrigger>
        </TabsList>

        {/* Transfer Tab */}
        <TabsContent value="transfers" className="space-y-6">
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowTransferForm(true)}
              className="flex items-center gap-2"
              data-testid="button-create-transfer"
            >
              <Plus size={16} />
              New Transfer
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-transfers">
                  {filteredRegularTransferPairs.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-exchange-alt text-primary text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-month-transfers">
                  {filteredRegularTransferPairs.filter(pair => {
                    const transferDate = new Date(pair[0].txDate);
                    const now = new Date();
                    return transferDate.getMonth() === now.getMonth() && 
                           transferDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar text-secondary text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-transfer-volume">
                  {formatCurrency(
                    filteredRegularTransferPairs.reduce((sum, pair) => {
                      const amount = pair.find(t => t.amountCents > 0)?.amountCents || 0;
                      return sum + amount;
                    }, 0)
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-dollar-sign text-accent text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>

          {/* Transfer History */}
          <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
          <p className="text-sm text-muted-foreground">Recent money transfers between your accounts</p>
        </CardHeader>
        <CardContent>
          {filteredRegularTransferPairs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exchange-alt text-muted-foreground text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No transfers yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first transfer to move money between accounts
              </p>
              <Button 
                onClick={() => setShowTransferForm(true)}
                data-testid="button-first-transfer"
              >
                Create Transfer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegularTransferPairs.map((pair, index) => {
                const fromTransaction = pair.find(t => t.amountCents < 0);
                const toTransaction = pair.find(t => t.amountCents > 0);
                
                if (!fromTransaction || !toTransaction) return null;
                
                return (
                  <div
                    key={fromTransaction.transferId}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                    data-testid={`transfer-${index}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {fromTransaction.accountName}
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {toTransaction.accountName}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatShortDate(fromTransaction.txDate)}</span>
                          <span>•</span>
                          <span>{fromTransaction.description?.replace(/^Transfer (to|from) [^:]*: /, '') || 'Transfer'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right min-w-[80px]">
                        <div className="font-semibold text-foreground">
                          {formatCurrency(Math.abs(fromTransaction.amountCents))}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Transfer
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTransfer(fromTransaction, toTransaction)}
                          className="h-7 w-7"
                          data-testid={`edit-transfer-${index}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTransfer(fromTransaction, toTransaction)}
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          data-testid={`delete-transfer-${index}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </CardContent>
          </Card>

        </TabsContent>

        {/* CC Payments Tab */}
        <TabsContent value="cc-payments" className="space-y-6">
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowCreditCardPaymentForm(true)}
              className="flex items-center gap-2"
              data-testid="button-create-cc-payment"
            >
              <Plus size={16} />
              Pay Credit Card
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total CC Payments</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-cc-payments">
                      {filteredCreditCardPaymentPairs.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-month-cc-payments">
                      {filteredCreditCardPaymentPairs.filter(pair => {
                        const paymentDate = new Date(pair[0].txDate);
                        const now = new Date();
                        return paymentDate.getMonth() === now.getMonth() && 
                               paymentDate.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-calendar text-purple-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold text-violet-600" data-testid="text-cc-payment-volume">
                      {formatCurrency(
                        filteredCreditCardPaymentPairs.reduce((sum, pair) => {
                          const source = pair.find(t => !creditCardTypes.includes(t.accountType || ''));
                          const amount = source ? Math.abs(source.amountCents) : 0;
                          return sum + amount;
                        }, 0)
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-dollar-sign text-violet-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Credit Card Payment History</CardTitle>
              <p className="text-sm text-muted-foreground">Payments made to your credit card accounts</p>
            </CardHeader>
            <CardContent>
              {creditCardPaymentPairs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No credit card payments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Record your first credit card payment to start tracking
                  </p>
                  <Button 
                    onClick={() => setShowCreditCardPaymentForm(true)}
                    data-testid="button-first-cc-payment"
                  >
                    Pay Credit Card
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {creditCardPaymentPairs.map((pair, index) => {
                    const sourceTransaction = pair.find(t => !creditCardTypes.includes(t.accountType || ''));
                    const creditTransaction = pair.find(t => creditCardTypes.includes(t.accountType || ''));
                    
                    if (!sourceTransaction || !creditTransaction) return null;
                    
                    const fromTransaction = sourceTransaction;
                    const toTransaction = creditTransaction;
                    
                    return (
                      <div
                        key={fromTransaction.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                        data-testid={`cc-payment-${index}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-violet-600" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">
                                {fromTransaction.accountName}
                              </span>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {toTransaction.accountName}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatShortDate(fromTransaction.txDate)}</span>
                              <span>•</span>
                              <span>{fromTransaction.description || 'Credit Card Payment'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right min-w-[80px]">
                            <div className="font-semibold text-violet-600">
                              {formatCurrency(Math.abs(fromTransaction.amountCents))}
                            </div>
                            <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700">
                              CC Payment
                            </Badge>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTransfer(fromTransaction, toTransaction)}
                              className="h-7 w-7"
                              data-testid={`edit-cc-payment-${index}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTransfer(fromTransaction, toTransaction)}
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              data-testid={`delete-cc-payment-${index}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2"
              data-testid="button-create-expense"
            >
              <Plus size={16} />
              Add Expense
            </Button>
          </div>

          {/* Expense Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-expenses">
                      {filteredExpenses.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-month-expenses">
                      {filteredExpenses.filter(expense => {
                        const expenseDate = new Date(expense.txDate);
                        const now = new Date();
                        return expenseDate.getMonth() === now.getMonth() && 
                               expenseDate.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-calendar text-orange-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-expense-volume">
                      {formatCurrency(
                        filteredExpenses.reduce((sum, expense) => sum + Math.abs(expense.amountCents), 0)
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-dollar-sign text-red-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense History */}
          <Card>
            <CardHeader>
              <CardTitle>Expense History</CardTitle>
              <p className="text-sm text-muted-foreground">Recent expenses and purchases</p>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No expenses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Record your first expense to start tracking your spending
                  </p>
                  <Button 
                    onClick={() => setShowExpenseForm(true)}
                    data-testid="button-first-expense"
                  >
                    Add Expense
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredExpenses.map((expense, index) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                      data-testid={`expense-${index}`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-red-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {expense.accountName}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {expense.categoryName}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatShortDate(expense.txDate)}</span>
                            <span>•</span>
                            <span>{expense.description || 'Expense'}</span>
                            {expense.taxOnly && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300">
                                Tax Only
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right min-w-[80px]">
                          <div className="font-semibold text-red-600">
                            -{formatCurrency(Math.abs(expense.amountCents))}
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            Expense
                          </Badge>
                        </div>
                        {expense.receiptPath && (
                          <div className="flex flex-col gap-0.5">
                            {expense.receiptPath.split(',').filter(Boolean).map((p, i, arr) => (
                              <a key={i} href={p} target="_blank" rel="noopener noreferrer" title={arr.length > 1 ? `Receipt ${i + 1}` : 'View Receipt'}>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                                </Button>
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTransaction(expense)}
                            className="h-7 w-7"
                            data-testid={`edit-expense-${index}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTransaction(expense)}
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            data-testid={`delete-expense-${index}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bills Tab */}
        <TabsContent value="bills" className="space-y-6">
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowBillPaymentForm(true)}
              className="flex items-center gap-2"
              data-testid="button-create-bill"
            >
              <Plus size={16} />
              Pay Bill
            </Button>
          </div>

          {/* Bills Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bill Payments</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-bills">
                      {filteredBillPayments.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-month-bills">
                      {filteredBillPayments.filter(bill => {
                        const billDate = new Date(bill.txDate);
                        const now = new Date();
                        return billDate.getMonth() === now.getMonth() && 
                               billDate.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-calendar text-purple-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-bill-volume">
                      {formatCurrency(
                        filteredBillPayments.reduce((sum, bill) => sum + Math.abs(bill.amountCents), 0)
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-dollar-sign text-blue-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bill Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Bill Payment History</CardTitle>
              <p className="text-sm text-muted-foreground">Recent bill payments and recurring expenses</p>
            </CardHeader>
            <CardContent>
              {filteredBillPayments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No bill payments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Record your first bill payment to start tracking
                  </p>
                  <Button 
                    onClick={() => setShowBillPaymentForm(true)}
                    data-testid="button-first-bill"
                  >
                    Pay Bill
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBillPayments.map((bill, index) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                      data-testid={`bill-${index}`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {bill.accountName}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {bill.categoryName}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatShortDate(bill.txDate)}</span>
                            <span>•</span>
                            <span>{bill.description || 'Bill Payment'}</span>
                            {bill.taxOnly && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300">
                                Tax Only
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right min-w-[80px]">
                          <div className="font-semibold text-blue-600">
                            -{formatCurrency(Math.abs(bill.amountCents))}
                          </div>
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            Bill
                          </Badge>
                        </div>
                        {bill.receiptPath && (
                          <div className="flex flex-col gap-0.5">
                            {bill.receiptPath.split(',').filter(Boolean).map((p, i, arr) => (
                              <a key={i} href={p} target="_blank" rel="noopener noreferrer" title={arr.length > 1 ? `Receipt ${i + 1}` : 'View Receipt'}>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                                </Button>
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTransaction(bill)}
                            className="h-7 w-7"
                            data-testid={`edit-bill-${index}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTransaction(bill)}
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            data-testid={`delete-bill-${index}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-6">
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowIncomeForm(true)}
              className="flex items-center gap-2"
              data-testid="button-create-income"
            >
              <Plus size={16} />
              Add Income
            </Button>
          </div>

          {/* Income Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Income Entries</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-income">
                      {filteredIncomeTransactions.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-month-income">
                      {filteredIncomeTransactions.filter(income => {
                        const incomeDate = new Date(income.txDate);
                        const now = new Date();
                        return incomeDate.getMonth() === now.getMonth() && 
                               incomeDate.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-calendar text-emerald-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-income-volume">
                      {formatCurrency(
                        filteredIncomeTransactions.reduce((sum, income) => sum + income.amountCents, 0)
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-dollar-sign text-green-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Income History */}
          <Card>
            <CardHeader>
              <CardTitle>Income History</CardTitle>
              <p className="text-sm text-muted-foreground">Recent income from various sources</p>
            </CardHeader>
            <CardContent>
              {filteredIncomeTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No income recorded yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Record your first income to start tracking earnings
                  </p>
                  <Button 
                    onClick={() => setShowIncomeForm(true)}
                    data-testid="button-first-income"
                  >
                    Add Income
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIncomeTransactions.map((income, index) => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                      data-testid={`income-${index}`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {income.accountName}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {income.categoryName}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatShortDate(income.txDate)}</span>
                            <span>•</span>
                            <span>{income.description || 'Income'}</span>
                            {income.taxOnly && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300">
                                Tax Only
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right min-w-[80px]">
                          <div className="font-semibold text-green-600">
                            +{formatCurrency(income.amountCents)}
                          </div>
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Income
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTransaction(income)}
                            className="h-7 w-7"
                            data-testid={`edit-income-${index}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTransaction(income)}
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            data-testid={`delete-income-${index}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investment Tab */}
        <TabsContent value="investments" className="space-y-6">
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowInvestmentForm(true)}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Landmark className="h-4 w-4" />
              Record Investment
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              {filteredInvestmentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Landmark className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No investment transactions found</p>
                  <p className="text-sm mt-1">Record gains and losses to track your investment performance</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredInvestmentTransactions.map((tx) => {
                    const isGain = tx.amountCents > 0;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`p-2 rounded-full ${isGain ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
                            <Landmark className={`h-4 w-4 ${isGain ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{tx.description || 'Investment'}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{tx.accountName}</span>
                              <span>•</span>
                              <span>{tx.categoryName}</span>
                              <span>•</span>
                              <span>{formatShortDate(tx.txDate)}</span>
                              {tx.taxOnly && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600 font-medium">Tax Only</span>
                                </>
                              )}
                              {tx.isPersonal && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-600 font-medium">Personal</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold ${isGain ? 'text-green-600' : 'text-red-600'}`}>
                            {isGain ? '+' : ''}{formatCurrency(tx.amountCents)}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingTransaction(tx);
                                setShowEditForm(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTransaction(tx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Form Dialog */}
      <TransferForm 
        open={showTransferForm} 
        onOpenChange={setShowTransferForm}
        defaultDate={dateFilter || undefined}
      />

      {/* Credit Card Payment Form Dialog */}
      <CreditCardPaymentForm 
        open={showCreditCardPaymentForm} 
        onOpenChange={setShowCreditCardPaymentForm}
        defaultDate={dateFilter || undefined}
      />

      {/* Form Dialogs */}
      <ExpenseForm 
        open={showExpenseForm} 
        onOpenChange={setShowExpenseForm}
        defaultDate={dateFilter || undefined}
      />
      
      <BillPaymentForm 
        open={showBillPaymentForm} 
        onOpenChange={setShowBillPaymentForm}
        defaultDate={dateFilter || undefined}
      />
      
      <IncomeForm 
        open={showIncomeForm} 
        onOpenChange={setShowIncomeForm}
        defaultDate={dateFilter || undefined}
      />

      <InvestmentForm 
        open={showInvestmentForm} 
        onOpenChange={setShowInvestmentForm}
        defaultDate={dateFilter || undefined}
      />

      {/* Edit Transaction Dialog */}
      <EditTransactionForm 
        open={showEditForm} 
        onOpenChange={setShowEditForm}
        transaction={editingTransaction}
      />

      {/* Edit Transfer Dialog */}
      <EditTransferForm 
        open={showEditTransferForm} 
        onOpenChange={setShowEditTransferForm}
        fromTransaction={editingFromTransaction}
        toTransaction={editingToTransaction}
      />
    </div>
  );
}