import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TransactionForm } from "@/components/transaction-form";
import { formatCurrency, formatShortDate, getCurrencyColor, getCategoryColor } from "@/lib/format";
import { type TransactionWithDetails } from "@shared/schema";
import { RefreshCw, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Transactions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: transactions = [], isLoading } = useQuery<TransactionWithDetails[]>({
    queryKey: ["/api/transactions"],
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Refreshed", description: "Transactions updated with latest data." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to refresh transactions.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transaction Management</h2>
          <p className="text-muted-foreground">Record income, expenses, and financial activities</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button onClick={() => setShowTransactionForm(true)} data-testid="button-add-transaction">
            <i className="fas fa-plus mr-2"></i>
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found. Add your first transaction to get started.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                      <TableCell className="font-medium">
                        {formatShortDate(transaction.txDate)}
                      </TableCell>
                      <TableCell>{transaction.accountName}</TableCell>
                      <TableCell>
                        {transaction.description || transaction.categoryName}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(transaction.categoryKind)}>
                          {transaction.categoryName}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${getCurrencyColor(transaction.amountCents)}`}>
                        {formatCurrency(transaction.amountCents)}
                      </TableCell>
                      <TableCell>
                        {transaction.receiptPath && (() => {
                          const paths = transaction.receiptPath.split(',').filter(Boolean);
                          if (paths.length === 1) {
                            return (
                              <a href={paths[0]} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Receipt">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </a>
                            );
                          }
                          return (
                            <div className="flex gap-0.5">
                              {paths.map((p, i) => (
                                <a key={i} href={p} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm" className="h-6 px-1" title={`Receipt ${i + 1}`}>
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-[10px] ml-0.5">{i + 1}</span>
                                  </Button>
                                </a>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionForm open={showTransactionForm} onOpenChange={setShowTransactionForm} />
    </div>
  );
}
