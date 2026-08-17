import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AccountCombobox } from "@/components/account-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { type AccountWithBalance, type Category, type Business } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getLocalISODate } from "@/lib/format";

const incomeFormSchema = z.object({
  accountId: z.string().min(1, "Please select an account"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) !== 0, {
      message: "Amount cannot be zero",
    }),
  txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  categoryId: z.string().min(1, "Please select a category"),
  taxOnly: z.boolean().default(false),
  isBusinessExpense: z.boolean().default(false),
  businessId: z.string().optional(),
});

type IncomeFormData = z.infer<typeof incomeFormSchema>;

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function IncomeForm({ open, onOpenChange, defaultDate }: IncomeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = getLocalISODate();

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeFormSchema),
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

  const isBusinessExpense = form.watch("isBusinessExpense");

  const { data: accounts = [] } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts", { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch accounts');
      return response.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories", { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
    queryFn: async () => {
      const response = await fetch("/api/businesses", { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch businesses');
      return response.json();
    },
  });

  // Filter categories to show income-related ones
  const incomeCategories = categories.filter(cat => cat.kind === 'income');

  const createIncomeMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      return await apiRequest("POST", "/api/income", {
        accountId: data.accountId,
        amount: parseFloat(data.amount),
        txDate: data.txDate,
        description: data.description,
        categoryId: data.categoryId,
        taxOnly: data.taxOnly,
        isBusinessExpense: data.isBusinessExpense,
        businessId: data.isBusinessExpense && data.businessId ? data.businessId : null,
      });
    },
    onSuccess: (response, variables) => {
      // Get current date for invalidation (handles midnight transitions)
      const currentDate = getLocalISODate();
      // Invalidate and force refetch of accounts queries to update balances immediately
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      // CRITICAL: Invalidate both transaction date and current date queries
      queryClient.invalidateQueries({ queryKey: ["/api/accounts", variables.txDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts", currentDate] });
      queryClient.refetchQueries({ queryKey: ["/api/accounts"] });
      queryClient.refetchQueries({ queryKey: ["/api/accounts", currentDate] });
      toast({
        title: "Income recorded",
        description: "Your income has been successfully recorded.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error recording income",
        description: error.message || "Failed to record income. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IncomeFormData) => {
    createIncomeMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Income</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      accounts={accounts}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select account to deposit to..."
                      data-testid="select-income-account"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      data-testid="input-income-amount"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use a negative amount for losses (e.g., -50.00 for a realized portfolio loss)
                  </p>
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
                      data-testid="input-income-date"
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
                      <SelectTrigger data-testid="select-income-category">
                        <SelectValue placeholder="Select income category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {incomeCategories.map((category) => (
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
                      placeholder="Enter income description..."
                      {...field}
                      data-testid="input-income-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxOnly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-amber-50 dark:bg-amber-950">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
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

            <FormField
              control={form.control}
              name="isBusinessExpense"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-blue-50 dark:bg-blue-950">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) form.setValue("businessId", "");
                      }}
                      data-testid="checkbox-business-income"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Business Income
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Mark this as business income for tax reporting
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
                data-testid="button-cancel-income"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createIncomeMutation.isPending}
                data-testid="button-submit-income"
              >
                {createIncomeMutation.isPending ? "Recording..." : "Record Income"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}