import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@finance/components/ui/button";
import { Input } from "@finance/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@finance/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@finance/components/ui/form";
import { AccountCombobox } from "@finance/components/account-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@finance/components/ui/select";
import { Textarea } from "@finance/components/ui/textarea";
import { useToast } from "@finance/hooks/use-toast";
import { Checkbox } from "@finance/components/ui/checkbox";
import { type AccountWithBalance, type Category, type Business } from "@finance-shared/schema";
import { apiRequest } from "@finance/lib/queryClient";
import { getLocalISODate } from "@finance/lib/format";

const investmentFormSchema = z.object({
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

type InvestmentFormData = z.infer<typeof investmentFormSchema>;

interface InvestmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function InvestmentForm({ open, onOpenChange, defaultDate }: InvestmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = getLocalISODate();

  const form = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentFormSchema),
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

  const investmentCategories = categories.filter(cat => cat.kind === 'investment');

  const createInvestmentMutation = useMutation({
    mutationFn: async (data: InvestmentFormData) => {
      const amount = parseFloat(data.amount);
      const selectedCat = investmentCategories.find(c => c.id === data.categoryId);
      const catName = selectedCat?.name?.toLowerCase() || '';
      const isLoss = catName.includes('loss');
      const endpoint = isLoss ? "/api/finance/expenses" : "/api/finance/income";
      return await apiRequest("POST", endpoint, {
        accountId: data.accountId,
        amount: Math.abs(amount),
        txDate: data.txDate,
        description: data.description,
        categoryId: data.categoryId,
        taxOnly: data.taxOnly,
        isBusinessExpense: data.isBusinessExpense,
        businessId: data.isBusinessExpense && data.businessId ? data.businessId : null,
      });
    },
    onSuccess: (response, variables) => {
      const currentDate = getLocalISODate();
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts", variables.txDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts", currentDate] });
      queryClient.refetchQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.refetchQueries({ queryKey: ["/api/finance/accounts", currentDate] });
      toast({
        title: "Investment recorded",
        description: "Your investment transaction has been recorded.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error recording investment",
        description: error.message || "Failed to record investment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvestmentFormData) => {
    createInvestmentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Investment Activity</DialogTitle>
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
                      placeholder="Select investment account..."
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
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select investment type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {investmentCategories.map((category) => (
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
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter as a positive number. Gains will increase your balance, losses will decrease it.
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
                    <Input type="date" {...field} />
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
                      placeholder="e.g., AAPL unrealized gain Q1 2026..."
                      {...field}
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
                      Record for tax purposes without affecting account balances (e.g., unrealized gains/losses)
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
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Business Investment
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Mark this as a business investment for tax reporting
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
                        <SelectTrigger>
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
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createInvestmentMutation.isPending}
              >
                {createInvestmentMutation.isPending ? "Recording..." : "Record Investment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
