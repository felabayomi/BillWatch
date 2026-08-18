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
import { Checkbox } from "@finance/components/ui/checkbox";
import { useToast } from "@finance/hooks/use-toast";
import { type AccountWithBalance, type Category, type Business } from "@finance-shared/schema";
import { apiRequest } from "@finance/lib/queryClient";
import { getLocalISODate } from "@finance/lib/format";
import { ArrowRight } from "lucide-react";

const creditCardPaymentFormSchema = z.object({
  fromAccountId: z.string().min(1, "Please select the account to pay from"),
  creditCardAccountId: z.string().min(1, "Please select the credit card to pay"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  categoryId: z.string().min(1, "Please select a category"),
  isBusinessExpense: z.boolean().default(false),
  businessId: z.string().optional(),
});

type CreditCardPaymentFormData = z.infer<typeof creditCardPaymentFormSchema>;

interface CreditCardPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function CreditCardPaymentForm({ open, onOpenChange, defaultDate }: CreditCardPaymentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = getLocalISODate();

  const form = useForm<CreditCardPaymentFormData>({
    resolver: zodResolver(creditCardPaymentFormSchema),
    defaultValues: {
      fromAccountId: "",
      creditCardAccountId: "",
      amount: "",
      txDate: defaultDate || today,
      description: "",
      categoryId: "",
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

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/finance/accounts", today],
    enabled: open,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/finance/categories"],
    enabled: open,
  });

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/finance/businesses"],
    queryFn: async () => {
      const response = await fetch("/api/finance/businesses", { credentials: "include" });
      if (!response.ok) throw new Error('Failed to fetch businesses');
      return response.json();
    },
    enabled: open,
  });

  const sourceAccounts = accounts.filter(acc => acc.type !== 'credit');
  const creditCardAccounts = accounts.filter(acc => acc.type === 'credit');
  const billCategories = categories.filter(cat => cat.kind === 'bill');

  const createPaymentMutation = useMutation({
    mutationFn: async (data: CreditCardPaymentFormData) => {
      return await apiRequest("POST", "/api/finance/credit-card-payments", {
        fromAccountId: data.fromAccountId,
        creditCardAccountId: data.creditCardAccountId,
        amount: parseFloat(data.amount),
        txDate: data.txDate,
        description: data.description,
        categoryId: data.categoryId,
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
        title: "Credit card payment recorded",
        description: "Payment applied to your credit card and tracked as a bill.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error recording payment",
        description: error.message || "Failed to record credit card payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreditCardPaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay Credit Card</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      accounts={sourceAccounts}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={accountsLoading ? "Loading accounts..." : "Select source account"}
                      disabled={accountsLoading}
                      testId="select-from-account"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>

            <FormField
              control={form.control}
              name="creditCardAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Credit Card</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      accounts={creditCardAccounts}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={accountsLoading ? "Loading accounts..." : "Select credit card"}
                      disabled={accountsLoading}
                      testId="select-credit-card"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        {...field}
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Category</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bill category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {billCategories.map((category) => (
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
                    <Input
                      placeholder="Enter payment description"
                      {...field}
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
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) form.setValue("businessId", "");
                      }}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    Mark as business expense for tax purposes
                  </FormLabel>
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

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPaymentMutation.isPending || accountsLoading}
                className="flex-1"
              >
                {createPaymentMutation.isPending ? "Processing..." : "Make Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
