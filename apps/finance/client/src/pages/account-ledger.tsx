import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { Badge } from "@finance/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@finance/components/ui/select";
import { formatCurrency, formatShortDate, getAccountTypeIcon } from "@finance/lib/format";
import { type AccountWithBalance, type TransactionWithDetails } from "@finance-shared/schema";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowLeftRight, Calendar } from "lucide-react";

export default function AccountLedger() {
  const [, params] = useRoute("/accounts/:id/ledger");
  const accountId = params?.id;
  const [monthFilter, setMonthFilter] = useState("all");

  const { data: accounts = [] } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/finance/accounts"],
  });

  const account = accounts.find(a => a.id === accountId);

  const { data: allTransactions = [], isLoading: txLoading } = useQuery<TransactionWithDetails[]>({
    queryKey: ["/api/finance/transactions", accountId],
    queryFn: async () => {
      const response = await fetch(`/api/finance/transactions?accountId=${accountId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!accountId,
  });

  const isLiability = account?.type === 'credit' || account?.type === 'loan' || 
    account?.type === 'mortgage' || account?.type === 'auto_loan' || 
    account?.type === 'student_loan' || account?.type === 'heloc' || 
    account?.type === 'business_loan';

  const availableMonths = (() => {
    const months = new Set<string>();
    allTransactions.forEach(t => {
      const d = new Date(t.txDate + "T00:00:00");
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return Array.from(months).sort().reverse();
  })();

  const filteredTransactions = monthFilter === "all"
    ? allTransactions
    : allTransactions.filter(t => {
        const d = new Date(t.txDate + "T00:00:00");
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === monthFilter;
      });

  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => new Date(a.txDate + "T00:00:00").getTime() - new Date(b.txDate + "T00:00:00").getTime()
  );

  const openingBalanceCents = account?.openingBalanceCents ?? 0;

  const allSorted = [...allTransactions].sort(
    (a, b) => new Date(a.txDate + "T00:00:00").getTime() - new Date(b.txDate + "T00:00:00").getTime()
  );

  let startingBalance = openingBalanceCents;
  if (monthFilter !== "all" && sortedTransactions.length > 0) {
    const firstFilteredDate = sortedTransactions[0].txDate;
    for (const t of allSorted) {
      if (t.txDate >= firstFilteredDate) break;
      startingBalance += t.amountCents;
    }
  }

  const ledgerRows: {
    transaction: TransactionWithDetails;
    inflow: number;
    outflow: number;
    runningBalance: number;
  }[] = [];

  let runningBalance = startingBalance;
  for (const t of sortedTransactions) {
    const amount = t.amountCents;
    let inflow = 0;
    let outflow = 0;

    if (isLiability) {
      if (amount > 0) {
        inflow = amount;
      } else {
        outflow = Math.abs(amount);
      }
    } else {
      if (amount > 0) {
        inflow = amount;
      } else {
        outflow = Math.abs(amount);
      }
    }

    runningBalance += amount;
    ledgerRows.push({ transaction: t, inflow, outflow, runningBalance });
  }

  const totalInflow = ledgerRows.reduce((s, r) => s + r.inflow, 0);
  const totalOutflow = ledgerRows.reduce((s, r) => s + r.outflow, 0);

  if (!account && !txLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Account not found</h3>
          <Link to="/accounts">
            <Button variant="outline">Back to Accounts</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (txLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const getMonthLabel = (key: string) => {
    const [year, month] = key.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{getAccountTypeIcon(account?.type || "")}</span>
            <h2 className="text-2xl font-bold text-foreground">{account?.name}</h2>
            <Badge variant="outline" className="capitalize">{account?.type}</Badge>
          </div>
          <p className="text-muted-foreground">
            {account?.institution ? `${account.institution} - ` : ""}Transaction ledger with running balance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/accounts">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Opening Balance</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(startingBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" /> Money In
            </p>
            <p className="text-xl font-bold text-green-600">
              +{formatCurrency(totalInflow)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-600" /> Money Out
            </p>
            <p className="text-xl font-bold text-red-600">
              -{formatCurrency(totalOutflow)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].runningBalance : startingBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Transaction Ledger</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {sortedTransactions.length} transaction{sortedTransactions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {availableMonths.map(m => (
                    <SelectItem key={m} value={m}>{getMonthLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                {monthFilter !== "all" ? "No transactions in this month. Try a different filter." : "This account has no transactions yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Description</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground hidden sm:table-cell">Category</th>
                    <th className="text-right py-3 px-2 font-semibold text-green-600">In</th>
                    <th className="text-right py-3 px-2 font-semibold text-red-600">Out</th>
                    <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="py-2.5 px-2 text-muted-foreground text-xs">
                      {account?.openingDate ? formatShortDate(account.openingDate) : "â€”"}
                    </td>
                    <td className="py-2.5 px-2 font-medium italic text-muted-foreground" colSpan={2}>
                      Opening Balance
                    </td>
                    <td className="py-2.5 px-2 hidden sm:table-cell"></td>
                    <td className="py-2.5 px-2"></td>
                    <td className="text-right py-2.5 px-2 font-semibold">
                      {formatCurrency(startingBalance)}
                    </td>
                  </tr>
                  {ledgerRows.map((row, index) => {
                    const isTransfer = !!row.transaction.transferId;
                    return (
                      <tr
                        key={row.transaction.id}
                        className={`border-b border-border hover:bg-accent/5 transition-colors ${index % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">
                          {formatShortDate(row.transaction.txDate)}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {row.transaction.description || "â€”"}
                            </span>
                            {isTransfer && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                Transfer
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-muted-foreground hidden sm:table-cell">
                          {row.transaction.categoryName}
                        </td>
                        <td className="text-right py-2.5 px-2">
                          {row.inflow > 0 ? (
                            <span className="text-green-600 font-medium">
                              +{formatCurrency(row.inflow)}
                            </span>
                          ) : null}
                        </td>
                        <td className="text-right py-2.5 px-2">
                          {row.outflow > 0 ? (
                            <span className="text-red-600 font-medium">
                              -{formatCurrency(row.outflow)}
                            </span>
                          ) : null}
                        </td>
                        <td className="text-right py-2.5 px-2 font-semibold whitespace-nowrap">
                          {formatCurrency(row.runningBalance)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/30 font-semibold">
                    <td className="py-2.5 px-2" colSpan={2}>
                      Totals
                    </td>
                    <td className="py-2.5 px-2 hidden sm:table-cell"></td>
                    <td className="text-right py-2.5 px-2 text-green-600">
                      +{formatCurrency(totalInflow)}
                    </td>
                    <td className="text-right py-2.5 px-2 text-red-600">
                      -{formatCurrency(totalOutflow)}
                    </td>
                    <td className="text-right py-2.5 px-2">
                      {formatCurrency(ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].runningBalance : startingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
