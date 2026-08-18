import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@finance/components/ui/button";
import { Input } from "@finance/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@finance/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@finance/components/ui/form";
import { Textarea } from "@finance/components/ui/textarea";
import { useToast } from "@finance/hooks/use-toast";
import { type TransactionWithDetails } from "@finance-shared/schema";
import { apiRequest } from "@finance/lib/queryClient";

const editTransferSchema = z.object({
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z.string().max(200, "Description too long").optional(),
});

type EditTransferData = z.infer<typeof editTransferSchema>;

interface EditTransferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromTransaction: TransactionWithDetails | null;
  toTransaction: TransactionWithDetails | null;
}

export function EditTransferForm({ open, onOpenChange, fromTransaction, toTransaction }: EditTransferFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditTransferData>({
    resolver: zodResolver(editTransferSchema),
    defaultValues: {
      amount: "",
      txDate: "",
      description: "",
    },
  });

  useEffect(() => {
    if (fromTransaction && open) {
      const desc = fromTransaction.description?.replace(/^Transfer (to|from) [^:]*: /, '') || "";
      form.reset({
        amount: (Math.abs(fromTransaction.amountCents) / 100).toFixed(2),
        txDate: fromTransaction.txDate,
        description: desc,
      });
    }
  }, [fromTransaction, open, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EditTransferData) => {
      if (!fromTransaction || !toTransaction) throw new Error("Missing transfer transactions");
      
      const amountCents = Math.round(parseFloat(data.amount) * 100);
      
      const fromDesc = `Transfer to ${toTransaction.accountName}: ${data.description || 'Transfer'}`;
      const toDesc = `Transfer from ${fromTransaction.accountName}: ${data.description || 'Transfer'}`;
      
      await apiRequest("PUT", `/api/finance/transactions/${fromTransaction.id}`, {
        amountCents: -amountCents,
        txDate: data.txDate,
        description: fromDesc,
      });
      
      await apiRequest("PUT", `/api/finance/transactions/${toTransaction.id}`, {
        amountCents: amountCents,
        txDate: data.txDate,
        description: toDesc,
      });
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/daily-balances"] });
      toast({
        title: "Transfer updated",
        description: "Both sides of the transfer have been updated.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update transfer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditTransferData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Transfer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-3 bg-muted rounded-lg mb-4">
              <p className="text-sm text-muted-foreground mb-1">From</p>
              <p className="font-medium">{fromTransaction?.accountName}</p>
              <p className="text-sm text-muted-foreground mt-2 mb-1">To</p>
              <p className="font-medium">{toTransaction?.accountName}</p>
            </div>

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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter transfer description"
                      className="resize-none"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
