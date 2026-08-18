import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { Input } from "@finance/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@finance/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@finance/components/ui/popover";
import { Calendar } from "@finance/components/ui/calendar";
import { AccountForm } from "@finance/components/account-form";
import { TransferForm } from "@finance/components/transfer-form";
import { CreditCardPaymentForm } from "@finance/components/credit-card-payment-form";
import { formatCurrency, formatShortDate, getCurrencyColor, getAccountTypeIcon, getCategoryColor, getLocalISODate } from "@finance/lib/format";
import { type AccountWithBalance, inferCategory } from "@finance-shared/schema"; 
import { apiRequest } from "@finance/lib/queryClient";
import { useToast } from "@finance/hooks/use-toast";
import { Link } from "wouter";
import { Label } from "@finance/components/ui/label";
import { Plus, ArrowLeftRight, Search, ChevronDown, ChevronUp, CalendarIcon, ChevronLeft, ChevronRight, CreditCard, Edit3, RefreshCw, TrendingUp, TrendingDown, Wallet, Building2, PiggyBank, Landmark, BarChart3 } from "lucide-react";
import { format, subDays, addDays, isToday, startOfDay } from "date-fns";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showCreditCardPaymentForm, setShowCreditCardPaymentForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isBalancesCollapsed, setIsBalancesCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [balanceCorrectionAccount, setBalanceCorrectionAccount] = useState<AccountWithBalance | null>(null);
  const [balanceCorrectionValue, setBalanceCorrectionValue] = useState("");
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const today = getLocalISODate();
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  
  const assetTypes = ['checking', 'savings', 'cash', 'investment', 'rewards'];

  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/finance/accounts", selectedDateString],
    queryFn: async () => {
      const response = await fetch(
        `/api/finance/accounts?date=${selectedDateString}`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    
    accounts.forEach((acc) => {
      const balance = acc.currentBalanceCents || 0;
      
      if (assetTypes.includes(acc.type)) {
        assets += balance;
      } else {
        liabilities += Math.abs(balance);
      }
    });

    return {
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: assets - liabilities,
    };
  }, [accounts]);

  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      await queryClient.refetchQueries({ queryKey: ["/api/finance/accounts", selectedDateString] });
      toast({ title: "Refreshed", description: "Dashboard data updated with latest transactions." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to refresh data.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBalanceCorrection = async () => {
    if (!balanceCorrectionAccount || !balanceCorrectionValue) return;
    setIsSubmittingCorrection(true);
    try {
      const dollars = parseFloat(balanceCorrectionValue);
      if (isNaN(dollars)) {
        toast({ title: "Error", description: "Please enter a valid number.", variant: "destructive" });
        return;
      }
      const correctBalanceCents = Math.round(dollars * 100);
      await apiRequest("POST", `/api/finance/accounts/${balanceCorrectionAccount.id}/set-balance`, {
        correctBalanceCents,
        date: selectedDateString,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      await queryClient.refetchQueries({ queryKey: ["/api/finance/accounts"] });
      toast({ title: "Balance corrected", description: `${balanceCorrectionAccount.name} balance set to $${dollars.toFixed(2)}` });
      setBalanceCorrectionAccount(null);
      setBalanceCorrectionValue("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to correct balance. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  if (accountsLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Financial overview and account management</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border p-6 animate-pulse">
              <div className="h-3 bg-muted rounded w-24 mb-3" />
              <div className="h-8 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-xl border p-6 animate-pulse">
            <div className="h-5 bg-muted rounded w-40 mb-4" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex justify-between py-3">
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-muted rounded-lg" />
                  <div>
                    <div className="h-4 bg-muted rounded w-28 mb-1" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                </div>
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border p-6 animate-pulse">
            <div className="h-5 bg-muted rounded w-32 mb-4" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted rounded-lg mb-2" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (accountsError) {
    return <div className="p-6">Error loading accounts: {accountsError.message}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Financial overview and account management</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-1 py-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="h-8 w-8 rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="min-w-[150px] justify-center text-center font-normal px-3"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex flex-col items-start">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
                    </span>
                    <span className="font-semibold text-sm">
                      {format(selectedDate, 'MMM d, yyyy')}
                    </span>
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
                <div className="p-3 border-t flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedDate(new Date());
                      setCalendarOpen(false);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedDate(subDays(new Date(), 1));
                      setCalendarOpen(false);
                    }}
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedDate(subDays(new Date(), 7));
                      setCalendarOpen(false);
                    }}
                  >
                    -7 Days
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              disabled={isToday(selectedDate)}
              className="h-8 w-8 rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Link to="/transfers">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90"
              >
                <ArrowLeftRight className="h-4 w-4 mr-1.5" />
                Transfer
              </Button>
            </Link>
            {!isToday(selectedDate) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="text-xs"
              >
                Back to Today
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-card dark:to-teal-950/30 p-6 shadow-md transition-all hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/40 dark:bg-emerald-800/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Assets</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1" data-testid="text-total-assets">
                {formatCurrency(totalAssets)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-red-200 dark:border-red-900/50 bg-gradient-to-br from-red-50 via-white to-rose-50 dark:from-red-950/40 dark:via-card dark:to-rose-950/30 p-6 shadow-md transition-all hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/40 dark:bg-red-800/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Total Liabilities</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 mt-1" data-testid="text-total-liabilities">
                {formatCurrency(totalLiabilities)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/40 dark:via-card dark:to-indigo-950/30 p-6 shadow-md transition-all hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/40 dark:bg-blue-800/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Net Worth</p>
              <p className={`text-2xl sm:text-3xl font-bold mt-1 ${netWorth >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-600 dark:text-red-400'}`} data-testid="text-net-worth">
                {formatCurrency(netWorth)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center shadow-sm">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Account Overview and Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card className="shadow-md border-border/60">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl"
              onClick={() => setIsBalancesCollapsed(!isBalancesCollapsed)}
              data-testid="button-toggle-balances"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      Account Balances
                      {isBalancesCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Current balances by account</p>
                  </div>
                </div>
                <Link to="/correct-balances" onClick={(e: any) => e.stopPropagation()}>
                  <span className="text-xs text-primary hover:underline cursor-pointer font-medium">Correct balances</span>
                </Link>
              </div>
              {!isBalancesCollapsed && (
                <div 
                  className="flex items-center space-x-2 mt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search accounts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-muted/30 border-border/50 focus:bg-card"
                      data-testid="input-search-accounts"
                    />
                  </div>
                </div>
              )}
            </CardHeader>
            {!isBalancesCollapsed && (
              <CardContent className="space-y-6 pt-2">
                {(() => {
                  const getAccountCategory = (acc: AccountWithBalance) => {
                    if (acc.category) return acc.category;
                    return inferCategory({ type: acc.type, name: acc.name, owner: acc.owner });
                  };
                  
                  const filtered = accounts
                    .filter((account) => 
                      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      account.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      account.owner.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .sort((a, b) => a.name.localeCompare(b.name));
                  
                  const personalAccounts = filtered.filter(acc => getAccountCategory(acc) === 'PERSONAL');
                  const savingsAccounts = filtered.filter(acc => getAccountCategory(acc) === 'SAVINGS');
                  const creditAccounts = filtered.filter(acc => getAccountCategory(acc) === 'CREDIT');
                  const businessAccounts = filtered.filter(acc => getAccountCategory(acc) === 'BUSINESS');
                  const investmentAccounts = filtered.filter(acc => getAccountCategory(acc) === 'INVESTMENT');
                  
                  const categoryConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
                    'Personal': { icon: Wallet, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
                    'Savings': { icon: PiggyBank, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    'Credit': { icon: CreditCard, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
                    'Business': { icon: Building2, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
                    'Investment': { icon: BarChart3, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
                  };

                  const renderCategorySection = (title: string, categoryAccounts: AccountWithBalance[]) => {
                    if (categoryAccounts.length === 0) return null;
                    const config = categoryConfig[title] || categoryConfig['Personal'];
                    const IconComponent = config.icon;
                    const sectionTotal = categoryAccounts.reduce((sum, acc) => sum + (acc.currentBalanceCents || 0), 0);
                    
                    return (
                      <div key={title} className="space-y-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 ${config.bgColor} rounded-md flex items-center justify-center`}>
                              <IconComponent className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <span className={`text-sm font-semibold ${config.color}`}>{title}</span>
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{categoryAccounts.length}</span>
                          </div>
                          <span className={`text-sm font-semibold ${getCurrencyColor(sectionTotal)}`}>
                            {formatCurrency(sectionTotal)}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {categoryAccounts.map((account) => (
                            <div key={account.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors group" data-testid={`account-${account.id}`}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-9 h-9 ${config.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                  <i className={`${getAccountTypeIcon(account.type)} ${config.color} text-sm`}></i>
                                </div>
                                <div className="min-w-0">
                                  <Link to={`/accounts/${account.id}/ledger`} className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate block">{account.name}</Link>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {account.institution || account.owner} • {account.type}
                                    {account.type === 'savings' && (account as any).apyPercent && (
                                      <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                        {(account as any).apyPercent}% APY
                                      </span>
                                    )}
                                    {account.type === 'credit' && (account as any).aprPercent && (
                                      <span className="ml-1.5 text-red-500 dark:text-red-400 font-medium">
                                        {(account as any).aprPercent}% APR
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-3">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setBalanceCorrectionAccount(account);
                                    setBalanceCorrectionValue((account.currentBalanceCents / 100).toFixed(2));
                                  }}
                                  className={`font-semibold text-sm ${getCurrencyColor(account.currentBalanceCents)} hover:underline cursor-pointer inline-flex items-center gap-1`}
                                  title="Tap to correct this balance"
                                >
                                  {formatCurrency(account.currentBalanceCents)}
                                  <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </button>
                                {account.type === 'credit' && (account as any).creditLimitCents && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency((account as any).creditLimitCents - Math.abs(account.currentBalanceCents))} avail
                                    </span>
                                    <span className="ml-1">of {formatCurrency((account as any).creditLimitCents)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  };
                  
                  if (accounts.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Landmark className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground mb-4 font-medium">No accounts yet</p>
                        <Link href="/accounts">
                          <Button variant="outline" data-testid="button-create-account" className="shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Account
                          </Button>
                        </Link>
                      </div>
                    );
                  }
                  
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground mb-1 font-medium">No accounts match "{searchTerm}"</p>
                        <p className="text-xs text-muted-foreground">Try searching by account name, type, or owner</p>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {renderCategorySection("Personal", personalAccounts)}
                      {renderCategorySection("Savings", savingsAccounts)}
                      {renderCategorySection("Credit", creditAccounts)}
                      {renderCategorySection("Business", businessAccounts)}
                      {renderCategorySection("Investment", investmentAccounts)}
                    </>
                  );
                })()}
            </CardContent>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-md border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <p className="text-xs text-muted-foreground">Common operations</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              
              <button 
                className="w-full p-3.5 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-all flex items-center gap-3 text-left group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                onClick={() => setShowTransferForm(true)}
                disabled={accounts.length < 2}
                data-testid="button-create-transfer"
              >
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-sm text-foreground">Transfer Money</div>
                  <div className="text-xs text-muted-foreground">
                    {accounts.length < 2 ? "Need 2+ accounts" : "Move between accounts"}
                  </div>
                </div>
              </button>

              <button 
                className="w-full p-3.5 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-all flex items-center gap-3 text-left group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                onClick={() => setShowCreditCardPaymentForm(true)}
                disabled={!accounts.some(acc => acc.type === 'credit') || !accounts.some(acc => acc.type !== 'credit')}
                data-testid="button-credit-card-payment"
              >
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="font-medium text-sm text-foreground">Pay Credit Card</div>
                  <div className="text-xs text-muted-foreground">
                    {!accounts.some(acc => acc.type === 'credit') 
                      ? "Add a credit card first" 
                      : "Pay & track as bill"}
                  </div>
                </div>
              </button>

              <Link href="/accounts">
                <button 
                  className="w-full p-3.5 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-all flex items-center gap-3 text-left group shadow-sm hover:shadow"
                  data-testid="button-manage-accounts"
                >
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground">Manage Accounts</div>
                    <div className="text-xs text-muted-foreground">Add, edit, or view details</div>
                  </div>
                </button>
              </Link>
              
              <Link href="/balance-sheet">
                <button 
                  className="w-full p-3.5 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-all flex items-center gap-3 text-left group shadow-sm hover:shadow"
                  data-testid="button-view-balance-sheet"
                >
                  <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground">Balance Sheet</div>
                    <div className="text-xs text-muted-foreground">Detailed financial position</div>
                  </div>
                </button>
              </Link>

              <Link href="/cash-flow">
                <button 
                  className="w-full p-3.5 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-all flex items-center gap-3 text-left group shadow-sm hover:shadow"
                >
                  <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground">Cash Flow</div>
                    <div className="text-xs text-muted-foreground">Income & expense tracking</div>
                  </div>
                </button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>


      
      {/* Account Form */}
      <AccountForm open={showAccountForm} onOpenChange={setShowAccountForm} />
      
      {/* Transfer Form */}
      <TransferForm open={showTransferForm} onOpenChange={setShowTransferForm} />

      {/* Credit Card Payment Form */}
      <CreditCardPaymentForm open={showCreditCardPaymentForm} onOpenChange={setShowCreditCardPaymentForm} />

      {/* Balance Correction Dialog */}
      <Dialog open={!!balanceCorrectionAccount} onOpenChange={(open) => { if (!open) { setBalanceCorrectionAccount(null); setBalanceCorrectionValue(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Correct Balance</DialogTitle>
          </DialogHeader>
          {balanceCorrectionAccount && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{balanceCorrectionAccount.name}</p>
                <p className="text-sm text-muted-foreground">
                  Current showing: <span className={getCurrencyColor(balanceCorrectionAccount.currentBalanceCents)}>{formatCurrency(balanceCorrectionAccount.currentBalanceCents)}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="correctBalance">Actual balance (enter the real amount)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="correctBalance"
                    type="number"
                    step="0.01"
                    value={balanceCorrectionValue}
                    onChange={(e) => setBalanceCorrectionValue(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a negative number for amounts you owe (e.g. -150.00 for credit cards)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setBalanceCorrectionAccount(null); setBalanceCorrectionValue(""); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleBalanceCorrection}
                  disabled={isSubmittingCorrection || !balanceCorrectionValue}
                >
                  {isSubmittingCorrection ? "Saving..." : "Set Balance"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowAccountForm(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 z-50 bg-primary"
        size="icon"
        data-testid="fab-add-account"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Add Account</span>
      </Button>
    </div>
  );
}
