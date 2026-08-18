import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@finance/components/ui/button";
import { Input } from "@finance/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@finance/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@finance/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@finance/components/ui/dialog";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@finance/lib/queryClient";
import { useToast } from "@finance/hooks/use-toast";
import { insertAccountSchema, type AccountCategory, type Account, inferCategory } from "@finance-shared/schema";
import type { Business } from "@finance-shared/schema";

const editFormSchema = insertAccountSchema.extend({
  openingBalance: z.string().min(1, "Opening balance is required"),
  apyPercent: z.string().optional(),
  aprPercent: z.string().optional(),
  creditLimit: z.string().optional(),
  businessId: z.string().optional(),
}).omit({
  openingBalanceCents: true,
  creditLimitCents: true,
});

type EditFormData = z.infer<typeof editFormSchema>;

interface EditAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}

export function EditAccountModal({ open, onOpenChange, account }: EditAccountModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: businesses = [] } = useQuery<Business[]>({ queryKey: ["/api/finance/businesses"] });

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: "",
      institution: "",
      type: "checking",
      owner: "personal",
      category: "PERSONAL" as AccountCategory,
      openingDate: new Date().toISOString().split('T')[0],
      openingBalance: "0.00",
      apyPercent: "",
      aprPercent: "",
      creditLimit: "",
      businessId: "",
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        institution: account.institution || "",
        type: account.type,
        owner: account.owner,
        category: account.category as AccountCategory,
        openingDate: account.openingDate,
        openingBalance: (account.openingBalanceCents / 100).toFixed(2),
        apyPercent: (account as any).apyPercent || "",
        aprPercent: (account as any).aprPercent || "",
        creditLimit: (account as any).creditLimitCents ? ((account as any).creditLimitCents / 100).toFixed(2) : "",
        businessId: (account as any).businessId || "",
      });
    }
  }, [account, form]);

  const updateCategoryBasedOnInputs = (type: string, name: string, owner: string) => {
    const inferredCategory = inferCategory({ type, name, owner, institution: form.getValues('institution') || undefined });
    form.setValue('category', inferredCategory);
  };

  const updateAccountMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      if (!account) throw new Error("No account to update");
      const { openingBalance, apyPercent, aprPercent, creditLimit, businessId, ...restData } = data;
      const creditLimitCents = data.type === 'credit' && creditLimit ? Math.round(parseFloat(creditLimit) * 100) : null;
      const selectedBiz = businesses.find(b => b.id === businessId);
      const accountData = {
        ...restData,
        openingBalanceCents: Math.round(parseFloat(openingBalance) * 100),
        apyPercent: data.type === 'savings' && apyPercent ? apyPercent : null,
        aprPercent: data.type === 'credit' && aprPercent ? aprPercent : null,
        creditLimitCents,
        businessId: data.owner === 'business' && businessId ? businessId : null,
        businessName: data.owner === 'business' && selectedBiz ? selectedBiz.name : null,
      };
      const response = await apiRequest("PATCH", `/api/finance/accounts/${account.id}`, accountData);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/finance/accounts"], type: "all" });
      toast({ title: "Success", description: "Account updated successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      let errorMessage = "Failed to update account";
      if (error.message.includes('401')) errorMessage = "Authentication required - please log in again";
      else if (error.message.includes('400')) errorMessage = "Invalid account data - please check your inputs";
      else if (error.message.includes('404')) errorMessage = "Account not found";
      else if (error.message.includes('500')) errorMessage = "Server error - please try again later";
      else if (error.message) errorMessage = `Update failed: ${error.message}`;
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    },
  });

  const onSubmit = (data: EditFormData) => {
    if (Object.keys(form.formState.errors).length > 0) {
      toast({ title: "Validation Error", description: "Please fix the form errors before submitting", variant: "destructive" });
      return;
    }
    updateAccountMutation.mutate(data);
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chase Checking" {...field} data-testid="input-edit-account-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chase Bank" {...field} value={field.value || ''} data-testid="input-edit-institution" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); updateCategoryBasedOnInputs(value, form.getValues('name'), form.getValues('owner')); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-account-type"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="rewards">Rewards</SelectItem>
                        <SelectItem value="credit">Credit Card</SelectItem>
                        <SelectItem value="loan">Personal Loan</SelectItem>
                        <SelectItem value="mortgage">Mortgage</SelectItem>
                        <SelectItem value="auto_loan">Auto Loan</SelectItem>
                        <SelectItem value="student_loan">Student Loan</SelectItem>
                        <SelectItem value="heloc">Home Equity Line of Credit</SelectItem>
                        <SelectItem value="business_loan">Business Loan</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); updateCategoryBasedOnInputs(form.getValues('type'), form.getValues('name'), value); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-owner"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch('owner') === 'business' && (
              <FormField
                control={form.control}
                name="businessId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Business</FormLabel>
                    {businesses.length === 0 ? (
                      <p className="text-sm text-amber-600 border border-amber-200 bg-amber-50 rounded-md px-3 py-2">
                        No businesses set up yet. Go to Settings to add a business first.
                      </p>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-business">
                            <SelectValue placeholder="Select a business..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {businesses.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormDescription className="text-muted-foreground">
                      Synced transactions on this account will automatically be assigned to this business
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PERSONAL">🏠 Personal</SelectItem>
                      <SelectItem value="SAVINGS">💰 Savings</SelectItem>
                      <SelectItem value="CREDIT">💳 Credit</SelectItem>
                      <SelectItem value="BUSINESS">🏢 Business</SelectItem>
                      <SelectItem value="INVESTMENT">📈 Investment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="openingBalance"
              render={({ field }) => {
                const selectedType = form.watch('type');
                const assetTypes = ['checking', 'savings', 'cash', 'investment', 'rewards'];
                const isLiabilityType = !assetTypes.includes(selectedType);
                return (
                  <FormItem>
                    <FormLabel>Opening Balance</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder={isLiabilityType ? "970.00 (amount owed)" : "0.00"} {...field} data-testid="input-edit-opening-balance" />
                    </FormControl>
                    {isLiabilityType && (
                      <FormDescription className="text-amber-600 dark:text-amber-400">
                        For {selectedType} accounts, enter the amount you owe as a positive number.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {form.watch('type') === 'savings' && (
              <FormField
                control={form.control}
                name="apyPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>APY %</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 4.50" {...field} value={field.value || ''} data-testid="input-edit-apy-percent" />
                    </FormControl>
                    <FormDescription className="text-muted-foreground">Annual Percentage Yield (optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch('type') === 'credit' && (
              <>
                <FormField
                  control={form.control}
                  name="aprPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>APR %</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 24.99" {...field} value={field.value || ''} data-testid="input-edit-apr-percent" />
                      </FormControl>
                      <FormDescription className="text-muted-foreground">Annual Percentage Rate (optional)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="creditLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Limit</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 5000.00" {...field} value={field.value || ''} data-testid="input-edit-credit-limit" />
                      </FormControl>
                      <FormDescription className="text-muted-foreground">Total credit limit on this card (optional)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="openingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-edit-opening-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={updateAccountMutation.isPending || !form.formState.isDirty} data-testid="button-update-account">
                {updateAccountMutation.isPending ? "Updating..." : "Update Account"}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
