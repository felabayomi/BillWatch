import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { BillForm } from "@finance/components/bill-form";
import { formatCurrency } from "@finance/lib/format";
import { type Bill } from "@finance-shared/schema";

export default function Bills() {
  const [showBillForm, setShowBillForm] = useState(false);

  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ["/api/finance/bills"],
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  
  const upcomingBills = bills.filter(bill => {
    if (!bill.dueDay) return false;
    return bill.dueDay >= currentDay && bill.dueDay <= currentDay + 30;
  });

  const allBills = bills;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bill Management</h2>
          <p className="text-muted-foreground">Track and manage recurring bills</p>
        </div>
        <Button onClick={() => setShowBillForm(true)} data-testid="button-add-bill">
          <i className="fas fa-plus mr-2"></i>
          Add Bill
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming Bills */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bills</CardTitle>
            <p className="text-sm text-muted-foreground">Bills due in the next 30 days</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingBills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming bills found.
              </div>
            ) : (
              upcomingBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                  data-testid={`upcoming-bill-${bill.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-file-invoice-dollar text-destructive"></i>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{bill.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Due day: {bill.dueDay}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">
                      {bill.amountCents ? formatCurrency(bill.amountCents) : 'Amount TBD'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* All Bills */}
        <Card>
          <CardHeader>
            <CardTitle>All Bills</CardTitle>
            <p className="text-sm text-muted-foreground">Complete list of tracked bills</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {allBills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bills found. Add your first bill to get started.
              </div>
            ) : (
              allBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                  data-testid={`bill-${bill.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-file-invoice-dollar text-primary"></i>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{bill.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Due day: {bill.dueDay || 'Not set'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">
                      {bill.amountCents ? formatCurrency(bill.amountCents) : 'Amount TBD'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <BillForm open={showBillForm} onOpenChange={setShowBillForm} />
    </div>
  );
}
