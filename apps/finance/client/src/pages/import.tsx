import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { Input } from "@finance/components/ui/input";
import { Label } from "@finance/components/ui/label";
import { Textarea } from "@finance/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@finance/components/ui/select";
import { useToast } from "@finance/hooks/use-toast";
import { formatCurrency } from "@finance/lib/format";
import { apiRequest } from "@finance/lib/queryClient";
import { type AccountWithBalance } from "@finance-shared/schema";

interface ImportData {
  date: string;
  accountId: string;
  amount: number;
  description: string;
  type: 'income' | 'expense' | 'bill';
}

export default function Import() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [csvData, setCsvData] = useState("");
  const [manualEntries, setManualEntries] = useState<ImportData[]>([
    { date: new Date().toISOString().split('T')[0], accountId: "", amount: 0, description: "", type: 'expense' }
  ]);

  const today = new Date().toISOString().split('T')[0];

  const { data: accounts = [] } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/finance/accounts", today],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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

  const importMutation = useMutation({
    mutationFn: async (data: ImportData[]) => {
      return apiRequest("POST", "/api/finance/import-external-data", { transactions: data });
    },
    onSuccess: () => {
      toast({
        title: "Import Successful",
        description: "External data has been imported and account balances updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      setCsvData("");
      setManualEntries([{ date: new Date().toISOString().split('T')[0], accountId: "", amount: 0, description: "", type: 'expense' }]);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data. Please check your format and try again.",
        variant: "destructive",
      });
    },
  });

  const addManualEntry = () => {
    setManualEntries([...manualEntries, { 
      date: new Date().toISOString().split('T')[0], 
      accountId: "", 
      amount: 0, 
      description: "", 
      type: 'expense' 
    }]);
  };

  const updateManualEntry = (index: number, field: keyof ImportData, value: string | number) => {
    const updated = [...manualEntries];
    updated[index] = { ...updated[index], [field]: value };
    setManualEntries(updated);
  };

  const removeManualEntry = (index: number) => {
    setManualEntries(manualEntries.filter((_, i) => i !== index));
  };

  const parseCsvData = (): ImportData[] => {
    if (!csvData.trim()) return [];
    
    const lines = csvData.trim().split('\n');
    const data: ImportData[] = [];
    
    lines.forEach((line, index) => {
      if (index === 0) return; // Skip header
      
      const [date, accountName, amount, description, type] = line.split(',').map(s => s.trim().replace(/"/g, ''));
      
      // Find account by name
      const account = accounts.find(acc => acc.name.toLowerCase() === accountName.toLowerCase());
      if (!account) return;
      
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum)) return;
      
      data.push({
        date: date || new Date().toISOString().split('T')[0],
        accountId: account.id,
        amount: amountNum,
        description: description || '',
        type: (type?.toLowerCase() as 'income' | 'expense' | 'bill') || 'expense'
      });
    });
    
    return data;
  };

  const handleImport = () => {
    let dataToImport: ImportData[] = [];
    
    if (csvData.trim()) {
      dataToImport = parseCsvData();
    } else {
      dataToImport = manualEntries.filter(entry => 
        entry.accountId && entry.amount !== 0 && entry.description.trim()
      );
    }
    
    if (dataToImport.length === 0) {
      toast({
        title: "No Data to Import",
        description: "Please add manual entries or provide valid CSV data.",
        variant: "destructive",
      });
      return;
    }
    
    importMutation.mutate(dataToImport);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Import External Data</h2>
        <p className="text-muted-foreground">Import income, expenses, and bills from your external tracking system</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Manual Entry */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Entry</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add individual transactions manually
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {manualEntries.map((entry, index) => (
              <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Entry {index + 1}</span>
                  {manualEntries.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeManualEntry(index)}
                      data-testid={`button-remove-entry-${index}`}
                    >
                      <i className="fas fa-trash text-destructive"></i>
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateManualEntry(index, 'date', e.target.value)}
                      data-testid={`input-date-${index}`}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select 
                      value={entry.type} 
                      onValueChange={(value: 'income' | 'expense' | 'bill') => updateManualEntry(index, 'type', value)}
                    >
                      <SelectTrigger data-testid={`select-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="bill">Bill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>Account</Label>
                  <Select 
                    value={entry.accountId} 
                    onValueChange={(value) => updateManualEntry(index, 'accountId', value)}
                  >
                    <SelectTrigger data-testid={`select-account-${index}`}>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.owner})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={entry.amount || ''}
                      onChange={(e) => updateManualEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                      data-testid={`input-amount-${index}`}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      placeholder="Transaction description"
                      value={entry.description}
                      onChange={(e) => updateManualEntry(index, 'description', e.target.value)}
                      data-testid={`input-description-${index}`}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              onClick={addManualEntry}
              className="w-full"
              data-testid="button-add-entry"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Another Entry
            </Button>
          </CardContent>
        </Card>

        {/* CSV Import */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Import</CardTitle>
            <p className="text-sm text-muted-foreground">
              Import data from a CSV file with columns: Date, Account Name, Amount, Description, Type
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-format">Expected CSV Format:</Label>
              <div className="text-xs text-muted-foreground p-2 bg-muted rounded mt-1">
                Date,Account Name,Amount,Description,Type<br/>
                2024-01-15,Chase Checking,-45.67,Grocery Store,expense<br/>
                2024-01-16,Chase Checking,2500.00,Salary,income<br/>
                2024-01-17,Wells Fargo Savings,-850.00,Rent Payment,bill
              </div>
            </div>
            
            <div>
              <Label htmlFor="csv-data">CSV Data</Label>
              <Textarea
                id="csv-data"
                placeholder="Paste your CSV data here..."
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={8}
                data-testid="textarea-csv-data"
              />
            </div>
            
            {csvData.trim() && (
              <div className="text-sm text-muted-foreground">
                Found {parseCsvData().length} valid entries to import
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Ready to Import</h3>
              <p className="text-sm text-muted-foreground">
                This will update your account balances based on the imported data
              </p>
            </div>
            <Button 
              onClick={handleImport}
              disabled={importMutation.isPending}
              data-testid="button-import-data"
            >
              {importMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Importing...
                </>
              ) : (
                <>
                  <i className="fas fa-upload mr-2"></i>
                  Import Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
