import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountCombobox } from "@/components/account-combobox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type AccountWithBalance } from "@shared/schema";
import { ArrowRight } from "lucide-react";
import { getLocalISODate } from "@/lib/format";

const transferFormSchema = z.object({
  fromAccountId: z.string().min(1, "Please select a source account"),
  toAccountId: z.string().min(1, "Please select a destination account"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "Source and destination accounts must be different",
  path: ["toAccountId"],
});

type TransferFormData = z.infer<typeof transferFormSchema>;

interface TransferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function TransferForm({ open, onOpenChange, defaultDate }: TransferFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = getLocalISODate();

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: "",
      txDate: defaultDate || today,
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.setValue("txDate", defaultDate || today);
    }
  }, [open, defaultDate]);

  // Fetch accounts for selection
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/accounts", today],
    enabled: open, // Only fetch when dialog is open
  });

  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      return await apiRequest("POST", "/api/transfers", {
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: parseFloat(data.amount),
        txDate: data.txDate,
        description: data.description,
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
        title: "Transfer created",
        description: "Your transfer has been successfully processed.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating transfer",
        description: error.message || "Failed to create transfer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransferFormData) => {
    createTransferMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-transfer">
        <DialogHeader>
          <DialogTitle>Create Transfer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* From Account */}
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      accounts={accounts}
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

            {/* Transfer Direction Icon */}
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>

            {/* To Account */}
            <FormField
              control={form.control}
              name="toAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Account</FormLabel>
                  <FormControl>
                    <AccountCombobox
                      accounts={accounts}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={accountsLoading ? "Loading accounts..." : "Select destination account"}
                      disabled={accountsLoading}
                      testId="select-to-account"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
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
                      data-testid="input-amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="txDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" data-testid="input-date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter transfer description" 
                      data-testid="input-description"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTransferMutation.isPending || accountsLoading}
                className="flex-1"
                data-testid="button-create-transfer"
              >
                {createTransferMutation.isPending ? "Creating..." : "Create Transfer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}