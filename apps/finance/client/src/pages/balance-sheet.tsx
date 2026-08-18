import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { formatCurrency, getCurrencyColor } from "@finance/lib/format";
import { type AccountWithBalance } from "@finance-shared/schema";
import { Wallet, PiggyBank, TrendingUp, CreditCard, Building2, HandCoins, AlertTriangle } from "lucide-react";

export default function BalanceSheet() {
  const today = new Date().toISOString().split('T')[0];

  const { data: accounts = [], isLoading } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/finance/accounts", today],
    queryFn: async () => {
      const response = await fetch(`/api/finance/accounts?date=${today}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading balance sheet...</div>;
  }

  const assetTypes = ['checking', 'savings', 'cash', 'investment', 'rewards'];
  const liabilityTypesList = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];

  const personalAccounts = accounts.filter(acc => acc.owner === 'personal');
  const businessAccounts = accounts.filter(acc => acc.owner === 'business');

  const personalAssetAccounts = personalAccounts.filter(a => assetTypes.includes(a.type) && a.currentBalanceCents >= 0);
  const businessAssetAccounts = businessAccounts.filter(a => assetTypes.includes(a.type) && a.currentBalanceCents >= 0);
  const negativeAssetAccounts = accounts.filter(a => assetTypes.includes(a.type) && a.currentBalanceCents < 0);

  const personalLiabilityAccounts = personalAccounts.filter(a => liabilityTypesList.includes(a.type));
  const businessLiabilityAccounts = businessAccounts.filter(a => liabilityTypesList.includes(a.type));

  const assetTypeMap: Record<string, { label: string; icon: typeof Wallet; order: number }> = {
    checking: { label: 'Cash & Checking', icon: Wallet, order: 1 },
    cash: { label: 'Cash', icon: Wallet, order: 2 },
    savings: { label: 'Savings', icon: PiggyBank, order: 3 },
    investment: { label: 'Investment Accounts', icon: TrendingUp, order: 4 },
    rewards: { label: 'Rewards', icon: HandCoins, order: 5 },
  };

  const liabilityTypeMap: Record<string, { label: string; icon: typeof Wallet; order: number }> = {
    credit: { label: 'Credit Cards', icon: CreditCard, order: 1 },
    loan: { label: 'Personal Loans', icon: HandCoins, order: 2 },
    mortgage: { label: 'Mortgages', icon: Building2, order: 3 },
    auto_loan: { label: 'Auto Loans', icon: HandCoins, order: 4 },
    student_loan: { label: 'Student Loans', icon: HandCoins, order: 5 },
    heloc: { label: 'HELOC', icon: Building2, order: 6 },
    business_loan: { label: 'Business Loans', icon: Building2, order: 7 },
  };

  const groupByType = (accs: AccountWithBalance[], typeMap: Record<string, { label: string; icon: typeof Wallet; order: number }>) => {
    const groups: Record<string, { label: string; icon: typeof Wallet; order: number; accounts: AccountWithBalance[]; total: number }> = {};
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
    <div key={acc.id} className="flex items-center justify-between py-2 pl-8 pr-2">
      <div>
        <div className="font-medium text-foreground text-sm">{acc.name}</div>
        <div className="text-xs text-muted-foreground">{acc.institution}</div>
      </div>
      <span className={`font-medium text-sm whitespace-nowrap ${getCurrencyColor(acc.currentBalanceCents)}`}>
        {formatCurrency(Math.abs(acc.currentBalanceCents))}
      </span>
    </div>
  );

  const renderGroup = (group: { label: string; icon: typeof Wallet; accounts: AccountWithBalance[]; total: number }, isLiability?: boolean) => (
    <div key={group.label} className="mb-3">
      <div className="flex items-center justify-between py-2 px-3 bg-muted/40 rounded-md">
        <div className="flex items-center gap-2">
          <group.icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{group.label}</span>
          <span className="text-xs text-muted-foreground">({group.accounts.length})</span>
        </div>
        <span className={`text-sm font-bold ${isLiability ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {formatCurrency(isLiability ? Math.abs(group.total) : group.total)}
        </span>
      </div>
      <div className="divide-y divide-muted/40">
        {group.accounts
          .sort((a, b) => Math.abs(b.currentBalanceCents) - Math.abs(a.currentBalanceCents))
          .map(renderAccountRow)}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Balance Sheet</h2>
        <p className="text-muted-foreground">Current financial position as of {new Date(today).toLocaleDateString()}</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {personalAssetGroups.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2 border-b pb-2">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Personal Accounts</h3>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(personalAssetsTotal)}</span>
                </div>
                {personalAssetGroups.map(g => renderGroup(g))}
              </div>
            )}

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
            {negativeAssetAccounts.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between py-2 px-3 bg-amber-50 dark:bg-amber-950/30 rounded-md mb-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold text-foreground">Overdraft / Payable</span>
                  </div>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(overdraftLiabilityTotal)}</span>
                </div>
                <div className="divide-y divide-muted/40">
                  {negativeAssetAccounts
                    .sort((a, b) => a.currentBalanceCents - b.currentBalanceCents)
                    .map(acc => (
                      <div key={acc.id} className="flex items-center justify-between py-2 pl-8 pr-2">
                        <div>
                          <div className="font-medium text-foreground text-sm">{acc.name}</div>
                          <div className="text-xs text-muted-foreground">{acc.institution}</div>
                        </div>
                        <span className="font-medium text-sm text-red-600 dark:text-red-400 whitespace-nowrap">
                          {formatCurrency(Math.abs(acc.currentBalanceCents))}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {personalLiabilityGroups.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2 border-b pb-2">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Personal Liabilities</h3>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(personalLiabilitiesTotal)}</span>
                </div>
                {personalLiabilityGroups.map(g => renderGroup(g, true))}
              </div>
            )}

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
    </div>
  );
}
