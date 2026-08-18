import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@finance/components/ui/button";
import { Input } from "@finance/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@finance/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@finance/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@finance/components/ui/select";
import { Textarea } from "@finance/components/ui/textarea";
import { Checkbox } from "@finance/components/ui/checkbox";
import { useToast } from "@finance/hooks/use-toast";
import { type TransactionWithDetails, type Category, type Business, type Account } from "@finance-shared/schema";
import { apiRequest } from "@finance/lib/queryClient";
import { Search, ChevronDown, Check } from "lucide-react";

const editTransactionSchema = z.object({
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z.string().max(200, "Description too long").optional(),
  categoryId: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
  isBusinessExpense: z.boolean().default(false),
  isPersonal: z.boolean().default(false),
  businessId: z.string().optional(),
});

type EditTransactionData = z.infer<typeof editTransactionSchema>;

interface EditTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionWithDetails | null;
}

export function EditTransactionForm({ open, onOpenChange, transaction }: EditTransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accountSearch, setAccountSearch] = useState("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const form = useForm<EditTransactionData>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      amount: "",
      txDate: "",
      description: "",
      categoryId: "",
      accountId: "",
      isBusinessExpense: false,
      isPersonal: false,
      businessId: "",
    },
  });

  const isBusinessExpense = form.watch("isBusinessExpense");
  const isPersonal = form.watch("isPersonal");

  useEffect(() => {
    if (transaction && open) {
      form.reset({
        amount: (Math.abs(transaction.amountCents) / 100).toFixed(2),
        txDate: transaction.txDate,
        description: transaction.description || "",
        categoryId: transaction.categoryId?.toString() || "",
        accountId: transaction.accountId?.toString() || "",
        isBusinessExpense: transaction.isBusinessExpense || false,
        isPersonal: transaction.isPersonal || false,
        businessId: (transaction as any).businessId || "",
      });
      setAccountSearch("");
      setAccountDropdownOpen(false);
    }
  }, [transaction, open, form]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/finance/accounts"],
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

  const updateMutation = useMutation({
    mutationFn: async (data: EditTransactionData) => {
      if (!transaction) throw new Error("No transaction to update");
      
      const selectedAccount = accounts.find(a => a.id === data.accountId);
      const liabilityTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];
      const isLiability = selectedAccount ? liabilityTypes.includes(selectedAccount.type) : false;
      
      const selectedCategory = categories.find(c => c.id === data.categoryId);
      const isIncome = selectedCategory?.kind === 'income';
      
      let amountCents: number;
      const rawAmount = Math.round(parseFloat(data.amount) * 100);
      if (isIncome) {
        amountCents = rawAmount;
      } else if (isLiability) {
        amountCents = rawAmount;
      } else {
        amountCents = -rawAmount;
      }
      
      const response = await apiRequest("PUT", `/api/finance/transactions/${transaction.id}`, {
        accountId: data.accountId,
        amountCents,
        txDate: data.txDate,
        description: data.description || null,
        categoryId: data.categoryId || null,
        isBusinessExpense: data.isBusinessExpense,
        isPersonal: data.isPersonal,
        businessId: data.isBusinessExpense && data.businessId ? data.businessId : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/daily-balances"] });
      toast({
        title: "Transaction updated",
        description: "Your transaction has been saved successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditTransactionData) => {
    updateMutation.mutate(data);
  };

  const filteredCategories = categories.filter(cat => {
    if (!transaction) return true;
    if (transaction.amountCents > 0) return cat.kind === 'income' || cat.kind === 'investment';
    return cat.kind === 'expense' || cat.kind === 'bill' || cat.kind === 'investment';
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => {
                const selectedAccount = accounts.find(a => a.id === field.value);
                const filteredAccounts = accounts.filter(a =>
                  a.name.toLowerCase().includes(accountSearch.toLowerCase())
                );
                return (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <div className="relative" ref={accountDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <span className={selectedAccount ? "text-foreground" : "text-muted-foreground"}>
                          {selectedAccount?.name || "Select an account"}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                      {accountDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-lg">
                          <div className="flex items-center border-b px-3 py-2">
                            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                            <input
                              type="text"
                              placeholder="Search accounts..."
                              value={accountSearch}
                              onChange={(e) => setAccountSearch(e.target.value)}
                              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {filteredAccounts.length === 0 ? (
                              <div className="py-3 text-center text-sm text-muted-foreground">No accounts found</div>
                            ) : (
                              filteredAccounts.map((account) => (
                                <button
                                  key={account.id}
                                  type="button"
                                  onClick={() => {
                                    field.onChange(account.id);
                                    setAccountDropdownOpen(false);
                                    setAccountSearch("");
                                  }}
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                >
                                  <Check className={`h-4 w-4 shrink-0 ${field.value === account.id ? "opacity-100" : "opacity-0"}`} />
                                  <span>{account.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
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
                    <Input {...field} type="date" />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name} ({category.kind})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {...field}
                      placeholder="Enter transaction description"
                      className="resize-none"
                      rows={2}
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
                        if (checked) {
                          form.setValue("isPersonal", false);
                        } else {
                          form.setValue("businessId", "");
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Business Transaction
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Mark this as a business transaction for tax reports
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPersonal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-blue-50 dark:bg-blue-950">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) {
                          form.setValue("isBusinessExpense", false);
                          form.setValue("businessId", "");
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Personal Transaction
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Mark this as personal even if it's from a business account (excluded from business reports)
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businesses.map((business) => (
                          <SelectItem key={business.id} value={business.id}>
                            {business.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
