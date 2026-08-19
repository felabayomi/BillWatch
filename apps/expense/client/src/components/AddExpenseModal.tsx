import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@expense/components/ui/dialog";
import { Button } from "@expense/components/ui/button";
import { Input } from "@expense/components/ui/input";
import { Label } from "@expense/components/ui/label";
import { Textarea } from "@expense/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@expense/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@expense/components/ui/form";
import { useCreateExpense, useUpdateDraft, useApproveDraft, useCategories } from "@expense/hooks/useExpenses";
import { useQuery } from "@tanstack/react-query";
import { insertExpenseSchema, EXPENSE_CATEGORIES, type Account } from "@expense-shared/schema";
import { X } from "lucide-react";
import { formatMountainTime } from "@expense/lib/timezone";

const formSchema = insertExpenseSchema.extend({
  amount: z.string().min(1, "Amount is required").transform((val) => parseFloat(val)),
  expenseDate: z.string().min(1, "Date is required"),
});

type FormData = z.infer<typeof formSchema>;

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<FormData>;
  draftId?: string;
}

export function AddExpenseModal({ open, onOpenChange, initialData, draftId }: AddExpenseModalProps) {
  const createExpense = useCreateExpense();
  const updateDraft = useUpdateDraft();
  const approveDraft = useApproveDraft();
  const { data: customCategories, isLoading: categoriesLoading } = useCategories();
  
  const { data: financeWatchData } = useQuery<{ accounts: string[], categories: string[] }>({
    queryKey: ["/api/expense/sync/finance-watch-data"],
  });
  const financeWatchCategories = Array.isArray(financeWatchData?.categories) ? financeWatchData.categories : [];

  const { data: myAccounts } = useQuery<Account[]>({
    queryKey: ["/api/expense/accounts"],
  });
  
  // Combine default and custom categories
  const allCategories = [
    // Default categories
    ...Object.entries(EXPENSE_CATEGORIES).map(([key, category]) => ({
      name: key,
      label: category.label,
      emoji: category.emoji,
      isDefault: true,
    })),
    // Custom categories
    ...(customCategories || []).map(category => ({
      name: category.name,
      label: category.label,
      emoji: category.emoji,
      isDefault: false,
    })),
  ];
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialData?.amount || 0,
      description: initialData?.description || "",
      category: initialData?.category || "",
      subcategory: initialData?.subcategory || "",
      expenseDate: initialData?.expenseDate
        ? new Date(initialData.expenseDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      paymentMethod: initialData?.paymentMethod || "",
      location: initialData?.location || "",
      notes: initialData?.notes || "",
      tags: initialData?.tags || [],
      type: (initialData?.type as any) || "personal",
      businessName: initialData?.businessName || "",
      financeWatchAccount: initialData?.financeWatchAccount || "",
      financeWatchCategory: initialData?.financeWatchCategory || "",
    },
  });

  const onSubmit = async (values: FormData) => {
    try {
      if (draftId) {
        // First save the user's reviewed/corrected values to the draft.
        await updateDraft.mutateAsync({
          id: draftId,
          data: {
            ...values,
            amount: values.amount.toString(),
            expenseDate: values.expenseDate,
          },
        });

        // Then approve the draft.
        // The server converts it into a permanent expense,
        // syncs it to FinanceWatch, and removes the draft.
        await approveDraft.mutateAsync(draftId);
      } else {
        await createExpense.mutateAsync({
          ...values,
          amount: values.amount.toString(),
          expenseDate: values.expenseDate,
        });
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(
        draftId
          ? "Failed to approve scanned draft:"
          : "Failed to create expense:",
        error,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{draftId ? "Edit Draft" : "Add Expense"}</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 p-0"
            data-testid="button-close-modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-add-expense">
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
                      data-testid="input-amount"
                      {...field}
                    />
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
                      placeholder="What did you buy?"
                      data-testid="input-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-category">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select a category"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allCategories.map((category) => (
                        <SelectItem key={category.name} value={category.name}>
                          {category.emoji} {category.label}
                          {!category.isDefault && <span className="text-xs text-muted-foreground ml-1">(Custom)</span>}
                        </SelectItem>
                      ))}
                      {categoriesLoading && (
                        <SelectItem value="" disabled>
                          Loading categories...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-type">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expense type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="personal">🏠 Personal</SelectItem>
                      <SelectItem value="business">💼 Business</SelectItem>
                      <SelectItem value="investment">📈 Investment</SelectItem>
                      <SelectItem value="loan">💰 Loan</SelectItem>
                      <SelectItem value="insurance">🛡️ Insurance</SelectItem>
                      <SelectItem value="tax">🧾 Tax</SelectItem>
                      <SelectItem value="medical">🏥 Medical</SelectItem>
                      <SelectItem value="charity">❤️ Charity</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expenseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      data-testid="input-date"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-payment-method">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="credit-card">💳 Credit Card</SelectItem>
                      <SelectItem value="debit-card">💳 Debit Card</SelectItem>
                      <SelectItem value="cash">💵 Cash</SelectItem>
                      <SelectItem value="check">📝 Check</SelectItem>
                      <SelectItem value="digital-wallet">📱 Digital Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional details..."
                      className="min-h-[80px]"
                      data-testid="textarea-notes"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <FormField
                control={form.control}
                name="financeWatchAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FinanceWatch Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {myAccounts && myAccounts.length > 0 ? (
                          myAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.name}>
                              {account.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                            No accounts imported yet. Go to Accounts to import from FinanceWatch.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="financeWatchCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FinanceWatch Category</FormLabel>
                    <FormControl>
                      <select
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">Select category</option>
                        {(financeWatchData?.categories || []).map((category: string) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  draftId
                    ? updateDraft.isPending || approveDraft.isPending
                    : createExpense.isPending
                }
                data-testid="button-submit-expense"
              >
                {draftId
                  ? (updateDraft.isPending || approveDraft.isPending
                    ? "Saving..."
                    : "Approve & Add Expense")
                  : (createExpense.isPending ? "Adding..." : "Add Expense")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
