import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@finance/components/ui/button";
import { Input } from "@finance/components/ui/input";
import { Label } from "@finance/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@finance/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@finance/components/ui/form";
import { AccountCombobox } from "@finance/components/account-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@finance/components/ui/select";
import { Textarea } from "@finance/components/ui/textarea";
import { Checkbox } from "@finance/components/ui/checkbox";
import { useToast } from "@finance/hooks/use-toast";
import { type AccountWithBalance, type Category, type Business } from "@finance-shared/schema";
import { apiRequest } from "@finance/lib/queryClient";
import { getLocalISODate } from "@finance/lib/format";
import { Upload, Loader2, Files } from "lucide-react";
import { Badge } from "@finance/components/ui/badge";

const expenseFormSchema = z.object({
  accountId: z.string().optional().default(""),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  categoryId: z.string().min(1, "Please select a category"),
  taxOnly: z.boolean().default(false),
  isBusinessExpense: z.boolean().default(false),
  businessId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.taxOnly && (!data.accountId || data.accountId.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select an account",
      path: ["accountId"],
    });
  }
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function ExpenseForm({ open, onOpenChange, defaultDate }: ExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = getLocalISODate();
  const [isParsing, setIsParsing] = useState(false);
  const [isBatchParsing, setIsBatchParsing] = useState(false);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [batchInfo, setBatchInfo] = useState<{ count: number; amounts: Array<{ amount: number | null; vendor: string | null }> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      accountId: "",
      amount: "",
      txDate: defaultDate || today,
      description: "",
      categoryId: "",
      taxOnly: false,
      isBusinessExpense: false,
      businessId: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.setValue("txDate", defaultDate || today);
    }
  }, [open, defaultDate]);

  const isTaxOnly = form.watch("taxOnly");
  const isBusinessExpense = form.watch("isBusinessExpense");

  const { data: accounts = [] } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/finance/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/finance/accounts", { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch accounts');
      return response.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/finance/categories"],
    queryFn: async () => {
      const response = await fetch("/api/finance/categories", { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/finance/businesses"],
    queryFn: async () => {
      const response = await fetch("/api/finance/businesses", { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch businesses');
      return response.json();
    },
  });

  // Filter categories to show expense-related ones
  const expenseCategories = categories.filter(cat => cat.kind === 'expense');

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      return await apiRequest("POST", "/api/finance/expenses", {
        accountId: data.taxOnly && !data.accountId ? null : data.accountId,
        amount: parseFloat(data.amount),
        txDate: data.txDate,
        description: data.description,
        categoryId: data.categoryId,
        taxOnly: data.taxOnly,
        isBusinessExpense: data.isBusinessExpense,
        businessId: data.isBusinessExpense && data.businessId ? data.businessId : null,
        receiptPath: receiptPath || undefined,
      });
    },
    onSuccess: (response, variables) => {
      // Get current date for invalidation (handles midnight transitions)
      const currentDate = getLocalISODate();
      // Invalidate all accounts queries (with and without date parameters)
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      // CRITICAL: Invalidate both transaction date and current date queries
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts", variables.txDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts", currentDate] });
      // Force immediate refetch of current accounts data
      queryClient.refetchQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.refetchQueries({ queryKey: ["/api/finance/accounts", currentDate] });
      toast({
        title: "Expense recorded",
        description: "Your expense has been successfully recorded.",
      });
      form.reset();
      setReceiptPath(null);
      setBatchInfo(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error recording expense",
        description: error.message || "Failed to record expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      
      const response = await fetch('/api/finance/parse-receipt', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to parse receipt');
      }
      
      const parsed = await response.json();
      
      if (parsed.amount) form.setValue('amount', String(parsed.amount));
      if (parsed.date) form.setValue('txDate', parsed.date);
      if (parsed.description) form.setValue('description', parsed.description);
      
      if (parsed.receiptPath) setReceiptPath(parsed.receiptPath);
      
      if (parsed.categoryHint && expenseCategories.length > 0) {
        const match = expenseCategories.find(c => 
          c.name.toLowerCase().includes(parsed.categoryHint.toLowerCase()) ||
          parsed.categoryHint.toLowerCase().includes(c.name.toLowerCase())
        );
        if (match) form.setValue('categoryId', match.id);
      }
      
      toast({
        title: "Receipt parsed",
        description: `Found: ${parsed.vendor || 'Unknown vendor'} - $${parsed.amount || '?'}`,
      });
    } catch (error: any) {
      toast({
        title: "Could not read receipt",
        description: error.message || "Try a clearer photo or enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBatchReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length < 2) {
      toast({
        title: "Select multiple files",
        description: "Please select 2 or more receipt files to merge into one expense.",
        variant: "destructive",
      });
      return;
    }

    setIsBatchParsing(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('receipts', files[i]);
      }

      const response = await fetch('/api/finance/parse-receipts-batch', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to parse receipts');
      }

      const parsed = await response.json();

      if (parsed.amount) form.setValue('amount', String(parsed.amount));
      if (parsed.date) form.setValue('txDate', parsed.date);
      if (parsed.description) form.setValue('description', parsed.description);

      if (parsed.receiptPath) setReceiptPath(parsed.receiptPath);

      if (parsed.receiptCount) {
        setBatchInfo({
          count: parsed.receiptCount,
          amounts: parsed.individualAmounts || [],
        });
      }

      if (parsed.categoryHint && expenseCategories.length > 0) {
        const match = expenseCategories.find(c =>
          c.name.toLowerCase().includes(parsed.categoryHint.toLowerCase()) ||
          parsed.categoryHint.toLowerCase().includes(c.name.toLowerCase())
        );
        if (match) form.setValue('categoryId', match.id);
      }

      toast({
        title: "Receipts merged",
        description: `${parsed.receiptCount} receipts combined - Total: $${parsed.amount}`,
      });
    } catch (error: any) {
      toast({
        title: "Could not read receipts",
        description: error.message || "Try clearer photos or enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsBatchParsing(false);
      if (batchFileInputRef.current) batchFileInputRef.current.value = '';
    }
  };

  const onSubmit = (data: ExpenseFormData) => {
    createExpenseMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Record Expense</DialogTitle>
            <div className="flex gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={handleReceiptUpload}
                disabled={isParsing || isBatchParsing}
              />
              <input
                ref={batchFileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={handleBatchReceiptUpload}
                disabled={isParsing || isBatchParsing}
                multiple
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing || isBatchParsing}
                className="gap-1.5 text-xs"
              >
                {isParsing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning...</>
                ) : (
                  <><Upload className="h-3.5 w-3.5" /> Receipt</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => batchFileInputRef.current?.click()}
                disabled={isParsing || isBatchParsing}
                className="gap-1.5 text-xs"
              >
                {isBatchParsing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Merging...</>
                ) : (
                  <><Files className="h-3.5 w-3.5" /> Merge Receipts</>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {batchInfo && (
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-3 space-y-1.5">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {batchInfo.count} receipts merged into one expense
            </p>
            <div className="flex flex-wrap gap-1.5">
              {batchInfo.amounts.map((item, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {item.vendor || `Receipt ${i + 1}`}: ${item.amount?.toFixed(2) || '?'}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="taxOnly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-amber-50 dark:bg-amber-950">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) form.setValue("accountId", "");
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Tax Reporting Only
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      This transaction won't affect account balances or dashboard totals
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {!isTaxOnly && (
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <FormControl>
                      <AccountCombobox
                        accounts={accounts}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder="Select account to deduct from..."
                        data-testid="select-expense-account"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      data-testid="input-expense-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="txDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-expense-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-expense-category">
                        <SelectValue placeholder="Select expense category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter expense description..."
                      {...field}
                      data-testid="input-expense-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isBusinessExpense"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-orange-50 dark:bg-orange-950">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) form.setValue("businessId", "");
                      }}
                      data-testid="checkbox-business-expense"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Business Expense
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Mark this as a business expense for tax deduction reports
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {isBusinessExpense && businesses.length > 0 && (
              <FormField
                control={form.control}
                name="businessId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="select-business">
                          <SelectValue placeholder="Select business..." />
                        </SelectTrigger>
                        <SelectContent>
                          {businesses.map((business) => (
                            <SelectItem key={business.id} value={business.id}>
                              {business.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-expense"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createExpenseMutation.isPending}
                data-testid="button-submit-expense"
              >
                {createExpenseMutation.isPending ? "Recording..." : "Record Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
