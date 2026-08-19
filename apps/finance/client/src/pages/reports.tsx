import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@finance/components/ui/select";
import { Button } from "@finance/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@finance/components/ui/tabs";
import { formatCurrency, getCurrencyColor, getAccountTypeIcon, formatShortDate } from "@finance/lib/format";
import { type TransactionWithDetails, type AccountWithBalance, type Category, type Business } from "@finance-shared/schema";
import { Printer, FileText, ChevronDown, ChevronRight, User, Search, Pencil, Wallet, PiggyBank, TrendingUp, Landmark, Building2, CreditCard, HandCoins, AlertTriangle } from "lucide-react";
import { Input } from "@finance/components/ui/input";
import { apiRequest } from "@finance/lib/queryClient";
import { useToast } from "@finance/hooks/use-toast";
import { EditTransactionForm } from "@finance/components/edit-transaction-form";
import { AccountantSharePanel } from "@finance/components/accountant-share-panel";

export default function Reports() {
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedBusinessFilter, setSelectedBusinessFilter] = useState("all");
  const [expandedLedger, setExpandedLedger] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryFilterText, setCategoryFilterText] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const { toast } = useToast();

  const togglePersonalMutation = useMutation({
    mutationFn: async ({ id, isPersonal }: { id: string; isPersonal: boolean }) => {
      const res = await apiRequest("PUT", `/api/finance/transactions/${id}`, { isPersonal });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      toast({ title: "Transaction updated" });
    },
  });

  const toggleLedger = (key: string) => {
    setExpandedLedger(prev => prev === key ? null : key);
  };

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<TransactionWithDetails[]>({
    queryKey: ["/api/finance/transactions"],
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/finance/accounts", today],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/finance/businesses"],
    queryFn: async () => {
      const response = await fetch("/api/finance/businesses", { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch businesses');
      return response.json();
    },
  });

  if (transactionsLoading || accountsLoading) {
    return <div className="p-6">Loading...</div>;
  }

  // Define liability account types (same as Balance Sheet for consistency)
  const liabilityTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];
  
  // Calculate account metrics - Assets are checking, savings, cash, investment
  const totalAssets = accounts
    .filter(acc => acc.type === 'checking' || acc.type === 'savings' || acc.type === 'cash' || acc.type === 'investment' || acc.type === 'rewards')
    .reduce((sum, acc) => sum + acc.currentBalanceCents, 0);

  // Liabilities are all liability account types
  const totalLiabilities = Math.abs(accounts
    .filter(acc => liabilityTypes.includes(acc.type))
    .reduce((sum, acc) => sum + acc.currentBalanceCents, 0));

  const netWorth = totalAssets - totalLiabilities;
  const totalAccountValue = accounts.reduce((sum, acc) => sum + acc.currentBalanceCents, 0);

  // Transfer analysis
  const transfers = transactions.filter(t => t.transferId);
  const transferGroups = new Map<string, TransactionWithDetails[]>();
  transfers.forEach(t => {
    if (!transferGroups.has(t.transferId!)) {
      transferGroups.set(t.transferId!, []);
    }
    transferGroups.get(t.transferId!)!.push(t);
  });

  const transferCount = transferGroups.size;
  const totalTransferVolume = Array.from(transferGroups.values())
    .reduce((sum, group) => {
      const amount = Math.abs(group.find(t => t.amountCents < 0)?.amountCents || 0);
      return sum + amount;
    }, 0);

  // Account distribution
  const personalAccounts = accounts.filter(acc => acc.owner === 'personal');
  const businessAccounts = accounts.filter(acc => acc.owner === 'business');
  const personalValue = personalAccounts.reduce((sum, acc) => sum + acc.currentBalanceCents, 0);
  const businessValue = businessAccounts.reduce((sum, acc) => sum + acc.currentBalanceCents, 0);

  // Imported data analysis
  const importedTransactions = transactions.filter(t => 
    t.description && t.description.includes('(Imported')
  );
  const importedIncome = importedTransactions
    .filter(t => t.categoryName?.includes('External Income'))
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
  const importedExpenses = importedTransactions
    .filter(t => t.categoryName?.includes('External Expense') || t.categoryName?.includes('External Bill'))
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);

  // Account type breakdown
  const accountsByType = new Map<string, { count: number; value: number }>();
  accounts.forEach(acc => {
    const current = accountsByType.get(acc.type) || { count: 0, value: 0 };
    accountsByType.set(acc.type, {
      count: current.count + 1,
      value: current.value + acc.currentBalanceCents
    });
  });

  // TAX REPORTS - Filter transactions by selected year
  const yearTransactions = transactions.filter(t => t.txDate.startsWith(selectedYear));
  
  // Get unique years from transactions for the year selector
  const availableYears = Array.from(new Set(transactions.map(t => t.txDate.substring(0, 4)))).sort().reverse();
  if (availableYears.length === 0) availableYears.push(currentYear.toString());
  
  // Annual Income (positive amounts, excluding transfers)
  const annualIncome = yearTransactions
    .filter(t => t.amountCents > 0 && !t.transferId)
    .reduce((sum, t) => sum + t.amountCents, 0);
  
  // Annual Expenses (negative amounts, excluding transfers)
  const annualExpenses = yearTransactions
    .filter(t => t.amountCents < 0 && !t.transferId)
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
  
  // Net for the year
  const annualNet = annualIncome - annualExpenses;
  
  // Business account IDs
  const businessAccountIds = businessAccounts.map(acc => acc.id);
  
  // All business transactions (unfiltered by business selection) - exclude personal transactions
  const allBusinessTransactions = yearTransactions.filter(t => 
    ((t.accountId && businessAccountIds.includes(t.accountId)) || t.isBusinessExpense) && !t.transferId && !t.isPersonal
  );

  // Apply business filter - when a specific business is selected, only show those transactions
  const businessTransactions = selectedBusinessFilter === "all"
    ? allBusinessTransactions
    : allBusinessTransactions.filter(t => t.businessName === selectedBusinessFilter);

  const selectedBusinessLabel = selectedBusinessFilter === "all" ? "All Businesses" : selectedBusinessFilter;
  
  const businessIncome = businessTransactions
    .filter(t => t.amountCents > 0)
    .reduce((sum, t) => sum + t.amountCents, 0);
  
  const businessExpenses = businessTransactions
    .filter(t => t.amountCents < 0)
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
  
  // Expense breakdown by category for deductions
  const expensesByCategory = new Map<string, { amount: number; transactions: TransactionWithDetails[] }>();
  yearTransactions
    .filter(t => t.amountCents < 0 && !t.transferId)
    .forEach(t => {
      const category = t.categoryName || 'Uncategorized';
      const current = expensesByCategory.get(category) || { amount: 0, transactions: [] };
      current.amount += Math.abs(t.amountCents);
      current.transactions.push(t);
      expensesByCategory.set(category, current);
    });
  
  // Business expense breakdown by category (respects business filter)
  const businessExpensesByCategory = new Map<string, { amount: number; transactions: TransactionWithDetails[] }>();
  businessTransactions
    .filter(t => t.amountCents < 0)
    .forEach(t => {
      const category = t.categoryName || 'Uncategorized';
      const current = businessExpensesByCategory.get(category) || { amount: 0, transactions: [] };
      current.amount += Math.abs(t.amountCents);
      current.transactions.push(t);
      businessExpensesByCategory.set(category, current);
    });

  // Business breakdown by business name (always uses unfiltered data)
  const expensesByBusiness = new Map<string, { income: number; expenses: number; transactions: TransactionWithDetails[] }>();
  allBusinessTransactions.forEach(t => {
    const bizName = t.businessName || 'Unassigned';
    const current = expensesByBusiness.get(bizName) || { income: 0, expenses: 0, transactions: [] };
    if (t.amountCents > 0) {
      current.income += t.amountCents;
    } else {
      current.expenses += Math.abs(t.amountCents);
    }
    current.transactions.push(t);
    expensesByBusiness.set(bizName, current);
  });

  return (
    <div className="p-6 space-y-6 print-report">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-report [class*="border"] { border-color: #ccc !important; }
          .print-report [class*="bg-"] { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-report [class*="bg-green"] { background: #f0fdf4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-report [class*="bg-red"] { background: #fef2f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-report [class*="bg-blue"] { background: #eff6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-report [class*="bg-orange"] { background: #fff7ed !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-report [class*="bg-muted"] { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.75in; }
        }
      `}</style>

      <div className="hidden print-only" style={{ display: 'none' }}>
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">Debt to Legacy LLC</h1>
          <p className="text-sm text-gray-600">30 N Gould St Ste R, Sheridan, WY 82801</p>
          <p className="text-sm text-gray-600">info@debttolegacy.com &middot; 240-664-2270</p>
          <h2 className="text-lg font-semibold mt-2">FinanceWatch — {selectedYear} Tax Report</h2>
          <p className="text-sm text-gray-600 mt-1">Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="text-xs text-gray-500 mt-1">Prepared for tax filing purposes</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financial Reports</h2>
          <p className="text-muted-foreground">Account balances, tax summaries, and deduction reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tax" className="w-full">
        <TabsList className="grid w-full grid-cols-5 no-print">
          <TabsTrigger value="tax" className="text-xs sm:text-sm px-1 sm:px-3">Tax Summary</TabsTrigger>
          <TabsTrigger value="business" className="text-xs sm:text-sm px-1 sm:px-3">Business</TabsTrigger>
          <TabsTrigger value="category" className="text-xs sm:text-sm px-1 sm:px-3">Categories</TabsTrigger>
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-1 sm:px-3">Overview</TabsTrigger>
          <TabsTrigger value="share" className="text-xs sm:text-sm px-1 sm:px-3">Share</TabsTrigger>
        </TabsList>

        {/* TAX SUMMARY TAB */}
        <TabsContent value="tax" className="space-y-6">
          {/* Annual Income & Expenses Summary */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-file-invoice-dollar text-primary"></i>
                {selectedYear} Tax Summary
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Annual income and expenses for tax filing purposes
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Income</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(annualIncome)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {yearTransactions.filter(t => t.amountCents > 0 && !t.transferId).length} transactions
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(annualExpenses)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {yearTransactions.filter(t => t.amountCents < 0 && !t.transferId).length} transactions
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-sm text-muted-foreground">Net Income</div>
                  <div className={`text-2xl font-bold ${annualNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(annualNet)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    For tax purposes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown by Category</CardTitle>
              <p className="text-sm text-muted-foreground">
                Deductible expenses organized by category for {selectedYear}
              </p>
            </CardHeader>
            <CardContent>
              {expensesByCategory.size === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No expenses recorded for {selectedYear}
                </div>
              ) : (
                <div className="space-y-1">
                  {Array.from(expensesByCategory.entries())
                    .sort((a, b) => b[1].amount - a[1].amount)
                    .map(([category, data]) => {
                      const ledgerKey = `tax-cat-${category}`;
                      const isExpanded = expandedLedger === ledgerKey;
                      return (
                        <div key={category}>
                          <button
                            onClick={() => toggleLedger(ledgerKey)}
                            className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              <span className="font-medium">{category}</span>
                              <span className="text-xs text-muted-foreground">({data.transactions.length})</span>
                            </div>
                            <span className="text-red-600 dark:text-red-400 font-semibold">
                              {formatCurrency(data.amount)}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="ml-6 mt-1 mb-2 border-l-2 border-muted pl-3 space-y-1">
                              {data.transactions
                                .sort((a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime())
                                .map(tx => (
                                  <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 text-sm rounded hover:bg-muted/30 group">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-muted-foreground whitespace-nowrap">{formatShortDate(tx.txDate)}</span>
                                      <span className="truncate">{tx.description || 'No description'}</span>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">{tx.accountName}</span>
                                      {tx.isPersonal && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Personal</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); togglePersonalMutation.mutate({ id: tx.id, isPersonal: !tx.isPersonal }); }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                                        title={tx.isPersonal ? "Unmark as personal" : "Mark as personal"}
                                      >
                                        <User className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setEditingTransaction(tx); setShowEditForm(true); }}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        title="Edit transaction"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <span className="text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                                        {formatCurrency(Math.abs(tx.amountCents))}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  <div className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-900 rounded-lg border-t-2 border-red-300 mt-2">
                    <span className="font-bold">Total Expenses</span>
                    <span className="text-red-700 dark:text-red-300 font-bold text-lg">
                      {formatCurrency(annualExpenses)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BUSINESS DEDUCTIONS TAB */}
        <TabsContent value="business" className="space-y-6">
          {/* Business Filter */}
          {businesses.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2">
                <i className="fas fa-filter text-orange-600"></i>
                <span className="text-sm font-medium">Filter by Business:</span>
              </div>
              <Select value={selectedBusinessFilter} onValueChange={setSelectedBusinessFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  {businesses.map(biz => (
                    <SelectItem key={biz.id} value={biz.name}>{biz.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBusinessFilter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedBusinessFilter("all")} className="text-orange-600">
                  Clear Filter
                </Button>
              )}
            </div>
          )}

          {/* Business Summary */}
          <Card className="border-2 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-briefcase text-orange-600"></i>
                {selectedYear} {selectedBusinessLabel} Summary
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedBusinessFilter === "all"
                  ? "Business transactions for deduction filing (includes marked business expenses)"
                  : `Tax report for ${selectedBusinessFilter} — ${selectedYear}`}
              </p>
            </CardHeader>
            <CardContent>
              {businessAccounts.length === 0 && businessTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No business expenses found. Mark accounts as "Business" or check "Business Expense" on individual transactions.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-sm text-muted-foreground">Business Income</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(businessIncome)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="text-sm text-muted-foreground">Business Expenses</div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(businessExpenses)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Potential deductions
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-sm text-muted-foreground">Net Business</div>
                    <div className={`text-2xl font-bold ${(businessIncome - businessExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(businessIncome - businessExpenses)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Expense Breakdown */}
          {(businessAccounts.length > 0 || businessTransactions.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedBusinessLabel} Expenses by Category</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedBusinessLabel} deductions organized by category for {selectedYear}
                </p>
              </CardHeader>
              <CardContent>
                {businessExpensesByCategory.size === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No business expenses recorded for {selectedYear}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {Array.from(businessExpensesByCategory.entries())
                      .sort((a, b) => b[1].amount - a[1].amount)
                      .map(([category, data]) => {
                        const ledgerKey = `biz-cat-${category}`;
                        const isExpanded = expandedLedger === ledgerKey;
                        return (
                          <div key={category}>
                            <button
                              onClick={() => toggleLedger(ledgerKey)}
                              className="flex items-center justify-between w-full p-3 bg-orange-50 dark:bg-orange-950 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                <span className="font-medium">{category}</span>
                                <span className="text-xs text-muted-foreground">({data.transactions.length})</span>
                              </div>
                              <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                {formatCurrency(data.amount)}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="ml-6 mt-1 mb-2 border-l-2 border-orange-200 dark:border-orange-800 pl-3 space-y-1">
                                {data.transactions
                                  .sort((a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime())
                                  .map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 text-sm rounded hover:bg-muted/30 group">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-muted-foreground whitespace-nowrap">{formatShortDate(tx.txDate)}</span>
                                        <span className="truncate">{tx.description || 'No description'}</span>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">{tx.accountName}</span>
                                        {tx.isPersonal && (
                                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Personal</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); togglePersonalMutation.mutate({ id: tx.id, isPersonal: !tx.isPersonal }); }}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                                          title={tx.isPersonal ? "Unmark as personal" : "Mark as personal"}
                                        >
                                          <User className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setEditingTransaction(tx); setShowEditForm(true); }}
                                          className="text-xs text-muted-foreground hover:text-foreground"
                                          title="Edit transaction"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <span className="text-orange-600 font-medium whitespace-nowrap">
                                          {formatCurrency(Math.abs(tx.amountCents))}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    <div className="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-900 rounded-lg border-t-2 border-orange-300 mt-2">
                      <span className="font-bold">Total Business Deductions</span>
                      <span className="text-orange-700 dark:text-orange-300 font-bold text-lg">
                        {formatCurrency(businessExpenses)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transaction Detail for filtered business */}
          {selectedBusinessFilter !== "all" && businessTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedBusinessFilter} Transactions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {businessTransactions.length} transactions for {selectedBusinessFilter} in {selectedYear}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {businessTransactions
                    .sort((a, b) => a.txDate.localeCompare(b.txDate))
                    .map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="flex-1">
                          <div className="font-medium">{t.description || 'No description'}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.txDate} &middot; {t.categoryName || 'Uncategorized'}{t.accountName ? ` · ${t.accountName}` : ''}{t.taxOnly ? ' · Tax Only' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.receiptPath && (() => {
                            const paths = t.receiptPath.split(',').filter(Boolean);
                            return paths.map((p, i) => (
                              <a key={i} href={p} target="_blank" rel="noopener noreferrer" title={paths.length > 1 ? `Receipt ${i + 1}` : 'View Receipt'}>
                                <FileText className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </a>
                            ));
                          })()}
                          <div className={`font-semibold ${t.amountCents >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                            {t.amountCents >= 0 ? '+' : '-'}{formatCurrency(Math.abs(t.amountCents))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business Breakdown by Business Name */}
          {selectedBusinessFilter === "all" && expensesByBusiness.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Breakdown by Business</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Income and expenses per business for {selectedYear}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from(expensesByBusiness.entries())
                    .sort((a, b) => (b[1].income + b[1].expenses) - (a[1].income + a[1].expenses))
                    .map(([bizName, totals]) => {
                      const incomeKey = `biz-income-${bizName}`;
                      const expenseKey = `biz-expense-${bizName}`;
                      const incomeTxs = totals.transactions.filter(t => t.amountCents > 0);
                      const expenseTxs = totals.transactions.filter(t => t.amountCents < 0);
                      return (
                        <div key={bizName} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-briefcase text-orange-600"></i>
                            <span className="font-semibold">{bizName}</span>
                            <span className="text-xs text-muted-foreground">({totals.transactions.length} transactions)</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Income</span>
                              {incomeTxs.length > 0 ? (
                                <button onClick={() => toggleLedger(incomeKey)} className="flex items-center gap-1 hover:underline">
                                  <span className="font-medium text-green-600">{formatCurrency(totals.income)}</span>
                                  {expandedLedger === incomeKey ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                </button>
                              ) : (
                                <div className="font-medium text-green-600">{formatCurrency(totals.income)}</div>
                              )}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Expenses</span>
                              {expenseTxs.length > 0 ? (
                                <button onClick={() => toggleLedger(expenseKey)} className="flex items-center gap-1 hover:underline">
                                  <span className="font-medium text-orange-600">{formatCurrency(totals.expenses)}</span>
                                  {expandedLedger === expenseKey ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                </button>
                              ) : (
                                <div className="font-medium text-orange-600">{formatCurrency(totals.expenses)}</div>
                              )}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Net</span>
                              <div className={`font-medium ${(totals.income - totals.expenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(totals.income - totals.expenses)}
                              </div>
                            </div>
                          </div>
                          {expandedLedger === incomeKey && incomeTxs.length > 0 && (
                            <div className="mt-3 border-t pt-2 space-y-1">
                              <div className="text-xs font-semibold text-muted-foreground mb-1">Income Transactions</div>
                              {incomeTxs
                                .sort((a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime())
                                .map(tx => (
                                  <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 text-sm rounded hover:bg-muted/50 group">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-muted-foreground whitespace-nowrap">{formatShortDate(tx.txDate)}</span>
                                      <span className="truncate">{tx.description || 'No description'}</span>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">{tx.accountName}</span>
                                      {tx.isPersonal && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Personal</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); togglePersonalMutation.mutate({ id: tx.id, isPersonal: !tx.isPersonal }); }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                                        title={tx.isPersonal ? "Unmark as personal" : "Mark as personal"}
                                      >
                                        <User className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setEditingTransaction(tx); setShowEditForm(true); }}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        title="Edit transaction"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <span className="text-green-600 font-medium whitespace-nowrap">
                                        +{formatCurrency(tx.amountCents)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                          {expandedLedger === expenseKey && expenseTxs.length > 0 && (
                            <div className="mt-3 border-t pt-2 space-y-1">
                              <div className="text-xs font-semibold text-muted-foreground mb-1">Expense Transactions</div>
                              {expenseTxs
                                .sort((a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime())
                                .map(tx => (
                                  <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 text-sm rounded hover:bg-muted/50 group">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-muted-foreground whitespace-nowrap">{formatShortDate(tx.txDate)}</span>
                                      <span className="truncate">{tx.description || 'No description'}</span>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">{tx.accountName}</span>
                                      {tx.isPersonal && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Personal</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); togglePersonalMutation.mutate({ id: tx.id, isPersonal: !tx.isPersonal }); }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                                        title={tx.isPersonal ? "Unmark as personal" : "Mark as personal"}
                                      >
                                        <User className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setEditingTransaction(tx); setShowEditForm(true); }}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        title="Edit transaction"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <span className="text-orange-600 font-medium whitespace-nowrap">
                                        -{formatCurrency(Math.abs(tx.amountCents))}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business Accounts List */}
          {businessAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Business Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {businessAccounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                          <i className={`${getAccountTypeIcon(acc.type)} text-orange-600`}></i>
                        </div>
                        <div>
                          <div className="font-medium">{acc.name}</div>
                          <div className="text-sm text-muted-foreground">{acc.institution}</div>
                        </div>
                      </div>
                      <span className={`font-semibold ${getCurrencyColor(acc.currentBalanceCents)}`}>
                        {formatCurrency(acc.currentBalanceCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CATEGORY LOOKUP TAB */}
        <TabsContent value="category" className="space-y-6">
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Category Spending Lookup
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Filter by year, month, and category to view spending details
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); }}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="01">January</SelectItem>
                    <SelectItem value="02">February</SelectItem>
                    <SelectItem value="03">March</SelectItem>
                    <SelectItem value="04">April</SelectItem>
                    <SelectItem value="05">May</SelectItem>
                    <SelectItem value="06">June</SelectItem>
                    <SelectItem value="07">July</SelectItem>
                    <SelectItem value="08">August</SelectItem>
                    <SelectItem value="09">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-72" ref={categoryDropdownRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search categories..."
                    value={categoryFilterText}
                    onChange={(e) => {
                      setCategoryFilterText(e.target.value);
                      setShowCategoryDropdown(true);
                      if (!e.target.value) {
                        setSelectedCategory("all");
                      }
                    }}
                    onFocus={() => setShowCategoryDropdown(true)}
                    className="pl-9"
                  />
                  {selectedCategory !== "all" && (
                    <button
                      onClick={() => { setSelectedCategory("all"); setCategoryFilterText(""); setCategorySearch(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  )}
                  {showCategoryDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <button
                        onClick={() => { setSelectedCategory("all"); setCategoryFilterText(""); setShowCategoryDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors font-medium"
                      >
                        All Categories
                      </button>
                      {Array.from(
                        new Set(
                          yearTransactions
                            .filter(t => !t.transferId && t.categoryName)
                            .map(t => t.categoryName!)
                        )
                      )
                        .sort()
                        .filter(cat => cat.toLowerCase().includes(categoryFilterText.toLowerCase()))
                        .map(cat => (
                          <button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setCategoryFilterText(cat); setShowCategoryDropdown(false); setCategorySearch(""); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedCategory === cat ? 'bg-muted font-medium' : ''}`}
                          >
                            {cat}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {(() => {
                const filteredByMonth = selectedMonth === "all"
                  ? yearTransactions
                  : yearTransactions.filter(t => t.txDate.substring(5, 7) === selectedMonth);

                const categoryTxs = filteredByMonth.filter(t =>
                  !t.transferId &&
                  (selectedCategory === "all" ? true : t.categoryName === selectedCategory)
                );

                const monthLabel = selectedMonth === "all"
                  ? selectedYear
                  : new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

                const totalSpent = categoryTxs
                  .filter(t => t.amountCents < 0)
                  .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
                const totalEarned = categoryTxs
                  .filter(t => t.amountCents > 0)
                  .reduce((sum, t) => sum + t.amountCents, 0);
                const expenseTxs = categoryTxs.filter(t => t.amountCents < 0);
                const incomeTxs = categoryTxs.filter(t => t.amountCents > 0);

                if (categoryTxs.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions found {selectedCategory !== "all" ? `for "${selectedCategory}"` : ""} in {monthLabel}
                    </div>
                  );
                }

                const categoryBreakdown = selectedCategory === "all"
                  ? (() => {
                      const map = new Map<string, { spent: number; earned: number; count: number }>();
                      categoryTxs.forEach(t => {
                        const cat = t.categoryName || "Uncategorized";
                        const cur = map.get(cat) || { spent: 0, earned: 0, count: 0 };
                        cur.count++;
                        if (t.amountCents < 0) cur.spent += Math.abs(t.amountCents);
                        else cur.earned += t.amountCents;
                        map.set(cat, cur);
                      });
                      return map;
                    })()
                  : null;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Total Spent</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(totalSpent)}
                        </div>
                        <div className="text-xs text-muted-foreground">{expenseTxs.length} transactions</div>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Total Earned</div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(totalEarned)}
                        </div>
                        <div className="text-xs text-muted-foreground">{incomeTxs.length} transactions</div>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Net</div>
                        <div className={`text-xl font-bold ${(totalEarned - totalSpent) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(totalEarned - totalSpent)}
                        </div>
                        <div className="text-xs text-muted-foreground">{categoryTxs.length} total</div>
                      </div>
                    </div>

                    {categoryBreakdown && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Spending by Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            {Array.from(categoryBreakdown.entries())
                              .sort((a, b) => b[1].spent - a[1].spent)
                              .map(([cat, data]) => (
                                <button
                                  key={cat}
                                  onClick={() => setSelectedCategory(cat)}
                                  className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{cat}</span>
                                    <span className="text-xs text-muted-foreground">({data.count})</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    {data.earned > 0 && (
                                      <span className="text-green-600 dark:text-green-400">+{formatCurrency(data.earned)}</span>
                                    )}
                                    {data.spent > 0 && (
                                      <span className="text-red-600 dark:text-red-400 font-semibold">{formatCurrency(data.spent)}</span>
                                    )}
                                  </div>
                                </button>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {selectedCategory !== "all" && (() => {
                      const subGroups = new Map<string, { total: number; transactions: TransactionWithDetails[] }>();
                      categoryTxs.forEach(t => {
                        const desc = (t.description || '').toLowerCase();
                        let subLabel = 'Other';
                        const keywords = [
                          'gas', 'fuel', 'car wash', 'car service', 'car repair', 'oil change', 'tire',
                          'parking', 'toll', 'uber', 'lyft', 'taxi', 'bus', 'train', 'subway', 'metro',
                          'insurance', 'registration', 'inspection', 'tow',
                          'electric', 'water', 'internet', 'phone', 'cable', 'streaming',
                          'rent', 'mortgage', 'maintenance', 'repair', 'plumbing', 'hvac',
                          'grocery', 'restaurant', 'dining', 'takeout', 'delivery', 'coffee',
                          'gift', 'birthday', 'holiday', 'donation', 'charity',
                          'doctor', 'dentist', 'pharmacy', 'medical', 'hospital', 'therapy',
                          'tuition', 'school', 'book', 'course', 'training',
                          'subscription', 'membership', 'software', 'hosting',
                          'clothing', 'shoes', 'haircut', 'salon',
                          'loan', 'payment', 'fee', 'interest', 'penalty',
                        ];
                        for (const kw of keywords) {
                          if (desc.includes(kw)) {
                            subLabel = kw.charAt(0).toUpperCase() + kw.slice(1);
                            break;
                          }
                        }
                        const cur = subGroups.get(subLabel) || { total: 0, transactions: [] };
                        cur.total += Math.abs(t.amountCents);
                        cur.transactions.push(t);
                        subGroups.set(subLabel, cur);
                      });

                      const searchLower = categorySearch.toLowerCase();
                      const filteredTxs = categorySearch
                        ? categoryTxs.filter(t => (t.description || '').toLowerCase().includes(searchLower))
                        : categoryTxs;

                      const filteredSearchTotal = filteredTxs
                        .filter(t => t.amountCents < 0)
                        .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);

                      return (
                        <>
                          {subGroups.size > 1 && !categorySearch && (
                            <Card>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">
                                    {selectedCategory} — Smart Breakdown
                                  </CardTitle>
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCategory("all"); setCategoryFilterText(""); }} className="text-xs">
                                    Back to All
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Automatically grouped by keywords found in your descriptions
                                </p>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-1">
                                  {Array.from(subGroups.entries())
                                    .sort((a, b) => b[1].total - a[1].total)
                                    .map(([label, data]) => {
                                      const subKey = `sub-${selectedCategory}-${label}`;
                                      const isExpanded = expandedLedger === subKey;
                                      return (
                                        <div key={label}>
                                          <button
                                            onClick={() => toggleLedger(subKey)}
                                            className="flex items-center justify-between w-full p-3 bg-purple-50 dark:bg-purple-950 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors text-left"
                                          >
                                            <div className="flex items-center gap-2">
                                              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                              <span className="font-medium">{label}</span>
                                              <span className="text-xs text-muted-foreground">({data.transactions.length})</span>
                                            </div>
                                            <span className="text-red-600 dark:text-red-400 font-semibold">
                                              {formatCurrency(data.total)}
                                            </span>
                                          </button>
                                          {isExpanded && (
                                            <div className="ml-6 mt-1 mb-2 border-l-2 border-purple-200 dark:border-purple-800 pl-3 space-y-1">
                                              {data.transactions
                                                .sort((a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime())
                                                .map(tx => (
                                                  <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 text-sm rounded hover:bg-muted/30 group">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                      <span className="text-muted-foreground whitespace-nowrap">{formatShortDate(tx.txDate)}</span>
                                                      <span className="truncate">{tx.description || 'No description'}</span>
                                                      <span className="text-xs text-muted-foreground whitespace-nowrap">{tx.accountName}</span>
                                                    </div>
                                                    <span className={`font-medium whitespace-nowrap ml-2 ${tx.amountCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                      {tx.amountCents >= 0 ? '+' : ''}{formatCurrency(tx.amountCents)}
                                                    </span>
                                                  </div>
                                                ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          <Card>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                  {selectedCategory} — {categorySearch ? `${filteredTxs.length} matches` : `${categoryTxs.length} Transactions`}
                                </CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedCategory("all"); setCategoryFilterText(""); setCategorySearch(""); }} className="text-xs">
                                  Back to All
                                </Button>
                              </div>
                              <div className="relative mt-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search descriptions (e.g. gas, car wash, gift)..."
                                  value={categorySearch}
                                  onChange={(e) => setCategorySearch(e.target.value)}
                                  className="pl-9"
                                />
                              </div>
                              {categorySearch && filteredTxs.length > 0 && (
                                <div className="mt-2 text-sm">
                                  <span className="text-muted-foreground">Total for "{categorySearch}": </span>
                                  <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(filteredSearchTotal)}</span>
                                </div>
                              )}
                            </CardHeader>
                            <CardContent>
                              {filteredTxs.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                  No transactions matching "{categorySearch}"
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {filteredTxs
                                    .sort((a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime())
                                    .map(tx => (
                                      <div key={tx.id} className="flex items-center justify-between py-2 px-3 text-sm rounded hover:bg-muted/50 group border-b border-muted last:border-0">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <span className="text-muted-foreground whitespace-nowrap w-20">{formatShortDate(tx.txDate)}</span>
                                          <div className="min-w-0">
                                            <div className="truncate font-medium">{tx.description || 'No description'}</div>
                                            <div className="text-xs text-muted-foreground">{tx.accountName}</div>
                                          </div>
                                          {tx.isBusinessExpense && (
                                            <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded whitespace-nowrap">Business</span>
                                          )}
                                          {tx.isPersonal && (
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded whitespace-nowrap">Personal</span>
                                          )}
                                          {tx.taxOnly && (
                                            <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded whitespace-nowrap">Tax Only</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); togglePersonalMutation.mutate({ id: tx.id, isPersonal: !tx.isPersonal }); }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                                            title={tx.isPersonal ? "Unmark as personal" : "Mark as personal"}
                                          >
                                            <User className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setEditingTransaction(tx); setShowEditForm(true); }}
                                            className="text-muted-foreground hover:text-foreground"
                                            title="Edit transaction"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </button>
                                          <span className={`font-semibold whitespace-nowrap ${tx.amountCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {tx.amountCents >= 0 ? '+' : ''}{formatCurrency(tx.amountCents)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </>
                      );
                    })()}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OVERVIEW TAB - Balance Sheet */}
        <TabsContent value="overview" className="space-y-6">
          {(() => {
            const assetTypes = ['checking', 'savings', 'cash', 'investment', 'rewards'];
            const liabilityTypesList = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];

            const personalAssetAccounts = personalAccounts.filter(a => assetTypes.includes(a.type) && a.currentBalanceCents >= 0);
            const businessAssetAccounts = businessAccounts.filter(a => assetTypes.includes(a.type) && a.currentBalanceCents >= 0);

            const negativeAssetAccounts = accounts.filter(a => assetTypes.includes(a.type) && a.currentBalanceCents < 0);

            const personalLiabilityAccounts = personalAccounts.filter(a => liabilityTypesList.includes(a.type));
            const businessLiabilityAccounts = businessAccounts.filter(a => liabilityTypesList.includes(a.type));

            const groupByType = (accs: AccountWithBalance[], typeMap: Record<string, { label: string; icon: any; order: number }>) => {
              const groups: Record<string, { label: string; icon: any; order: number; accounts: AccountWithBalance[]; total: number }> = {};
              accs.forEach(acc => {
                const key = acc.type;
                const meta = typeMap[key] || { label: key.charAt(0).toUpperCase() + key.slice(1), icon: Wallet, order: 99 };
                if (!groups[key]) {
                  groups[key] = { ...meta, accounts: [], total: 0 };
                }
                groups[key].accounts.push(acc);
                groups[key].total += acc.currentBalanceCents;
              });
              return Object.values(groups).sort((a, b) => a.order - b.order);
            };

            const assetTypeMap: Record<string, { label: string; icon: any; order: number }> = {
              checking: { label: 'Cash & Checking', icon: Wallet, order: 1 },
              cash: { label: 'Cash', icon: Wallet, order: 2 },
              savings: { label: 'Savings', icon: PiggyBank, order: 3 },
              investment: { label: 'Investment Accounts', icon: TrendingUp, order: 4 },
              rewards: { label: 'Rewards', icon: HandCoins, order: 5 },
            };

            const liabilityTypeMap: Record<string, { label: string; icon: any; order: number }> = {
              credit: { label: 'Credit Cards', icon: CreditCard, order: 1 },
              loan: { label: 'Personal Loans', icon: HandCoins, order: 2 },
              mortgage: { label: 'Mortgages', icon: Building2, order: 3 },
              auto_loan: { label: 'Auto Loans', icon: HandCoins, order: 4 },
              student_loan: { label: 'Student Loans', icon: HandCoins, order: 5 },
              heloc: { label: 'HELOC', icon: Building2, order: 6 },
              business_loan: { label: 'Business Loans', icon: Building2, order: 7 },
            };

            const personalAssetGroups = groupByType(personalAssetAccounts, assetTypeMap);
            const businessAssetGroups = groupByType(businessAssetAccounts, assetTypeMap);
            const personalLiabilityGroups = groupByType(personalLiabilityAccounts, liabilityTypeMap);
            const businessLiabilityGroups = groupByType(businessLiabilityAccounts, liabilityTypeMap);

            const personalAssetsTotal = personalAssetAccounts.reduce((s, a) => s + a.currentBalanceCents, 0);
            const businessAssetsTotal = businessAssetAccounts.reduce((s, a) => s + a.currentBalanceCents, 0);
            const overdraftTotal = negativeAssetAccounts.reduce((s, a) => s + a.currentBalanceCents, 0);
            const personalLiabilitiesTotal = personalLiabilityAccounts.reduce((s, a) => s + Math.abs(a.currentBalanceCents), 0);
            const businessLiabilitiesTotal = businessLiabilityAccounts.reduce((s, a) => s + Math.abs(a.currentBalanceCents), 0);
            const overdraftLiabilityTotal = Math.abs(overdraftTotal);

            const grandAssets = personalAssetsTotal + businessAssetsTotal;
            const grandLiabilities = personalLiabilitiesTotal + businessLiabilitiesTotal + overdraftLiabilityTotal;
            const grandNetWorth = grandAssets - grandLiabilities;

            const renderAccountRow = (acc: AccountWithBalance) => (
              <div key={acc.id} className="flex items-center justify-between py-1.5 pl-8 pr-2 text-sm">
                <span className="text-foreground truncate">{acc.name}</span>
                <span className={`font-medium whitespace-nowrap ${getCurrencyColor(acc.currentBalanceCents)}`}>
                  {formatCurrency(Math.abs(acc.currentBalanceCents))}
                </span>
              </div>
            );

            const renderGroup = (group: { label: string; icon: any; accounts: AccountWithBalance[]; total: number }, isLiability?: boolean) => (
              <div key={group.label} className="mb-3">
                <div className="flex items-center justify-between py-2 px-2 bg-muted/30 rounded-md">
                  <div className="flex items-center gap-2">
                    <group.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{group.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${isLiability ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {isLiability ? formatCurrency(Math.abs(group.total)) : formatCurrency(group.total)}
                  </span>
                </div>
                <div className="divide-y divide-muted/50">
                  {group.accounts
                    .sort((a, b) => Math.abs(b.currentBalanceCents) - Math.abs(a.currentBalanceCents))
                    .map(renderAccountRow)}
                </div>
              </div>
            );

            return (
              <>
                {/* Net Worth Summary Card */}
                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">Net Worth Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Assets</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(grandAssets)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Liabilities</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(grandLiabilities)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Net Worth</p>
                        <p className={`text-lg font-bold ${getCurrencyColor(grandNetWorth)}`}>{formatCurrency(grandNetWorth)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* ASSETS */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          Assets
                        </CardTitle>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(grandAssets)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {/* Personal Accounts */}
                      {personalAssetGroups.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2 border-b pb-2">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Personal Accounts</h3>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(personalAssetsTotal)}</span>
                          </div>
                          {personalAssetGroups.map(g => renderGroup(g))}
                        </div>
                      )}

                      {/* Business Accounts */}
                      {businessAssetGroups.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2 border-b pb-2">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Business Accounts</h3>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(businessAssetsTotal)}</span>
                          </div>
                          {businessAssetGroups.map(g => renderGroup(g))}
                        </div>
                      )}

                      {personalAssetGroups.length === 0 && businessAssetGroups.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">No asset accounts found</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* LIABILITIES */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-red-600" />
                          Liabilities
                        </CardTitle>
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(grandLiabilities)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {/* Overdraft / Negative Asset Accounts */}
                      {negativeAssetAccounts.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between py-2 px-2 bg-amber-50 dark:bg-amber-950/30 rounded-md mb-1">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <span className="text-sm font-semibold text-foreground">Overdraft / Payable</span>
                            </div>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(overdraftLiabilityTotal)}</span>
                          </div>
                          <div className="divide-y divide-muted/50">
                            {negativeAssetAccounts
                              .sort((a, b) => a.currentBalanceCents - b.currentBalanceCents)
                              .map(acc => (
                                <div key={acc.id} className="flex items-center justify-between py-1.5 pl-8 pr-2 text-sm">
                                  <span className="text-foreground truncate">{acc.name}</span>
                                  <span className="font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                                    {formatCurrency(Math.abs(acc.currentBalanceCents))}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Personal Liabilities */}
                      {personalLiabilityGroups.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2 border-b pb-2">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Personal Liabilities</h3>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(personalLiabilitiesTotal)}</span>
                          </div>
                          {personalLiabilityGroups.map(g => renderGroup(g, true))}
                        </div>
                      )}

                      {/* Business Liabilities */}
                      {businessLiabilityGroups.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2 border-b pb-2">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Business Liabilities</h3>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(businessLiabilitiesTotal)}</span>
                          </div>
                          {businessLiabilityGroups.map(g => renderGroup(g, true))}
                        </div>
                      )}

                      {personalLiabilityGroups.length === 0 && businessLiabilityGroups.length === 0 && negativeAssetAccounts.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">No liabilities found</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Transfer Activity & Imported Data */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Transfer Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Total Transfers</span>
                        <span className="font-semibold text-foreground">{transferCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Transfer Volume</span>
                        <span className="font-semibold text-foreground">{formatCurrency(totalTransferVolume)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Avg Transfer Size</span>
                        <span className="font-semibold text-foreground">
                          {transferCount > 0 ? formatCurrency(totalTransferVolume / transferCount) : formatCurrency(0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Imported Data Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Imported Transactions</span>
                        <span className="font-semibold text-foreground">{importedTransactions.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Imported Income</span>
                        <span className="font-semibold text-secondary">{formatCurrency(importedIncome)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Imported Expenses</span>
                        <span className="font-semibold text-destructive">{formatCurrency(importedExpenses)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })()}
        </TabsContent>

        {/* SHARE WITH ACCOUNTANT TAB */}
        <TabsContent value="share" className="space-y-6">
          <AccountantSharePanel />
        </TabsContent>

      </Tabs>
      <EditTransactionForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        transaction={editingTransaction}
      />
    </div>
  );
}
