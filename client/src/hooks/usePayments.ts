import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { BillPayment, InsertBillPayment } from "@shared/schema";

// Hook to fetch payment history for a specific bill
export function useBillPayments(billId: string | null) {
  return useQuery<{ payments: BillPayment[] }>({
    queryKey: ["/api/bills", billId, "payments"],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}/payments`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    enabled: !!billId, // Only run query when billId is provided
  });
}

// Hook to fetch current bill balance
export function useBillBalance(billId: string | null) {
  return useQuery<{ totalAmount: number; paidAmount: number; remainingBalance: number }>({
    queryKey: ["/api/bills", billId, "balance"],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}/balance`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    enabled: !!billId, // Only run query when billId is provided
  });
}

// Hook to create a new payment for a bill
export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentData: InsertBillPayment) => {
      const response = await apiRequest("POST", `/api/bills/${paymentData.billId}/payments`, paymentData);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      const billId = variables.billId;
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/bills", billId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills", billId, "balance"] });
      
      // Invalidate bill-related queries to update bill status
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/carryover"], exact: false });
    },
  });
}

// Hook to update an existing payment
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ paymentId, billId, ...updateData }: { paymentId: string; billId: string } & Partial<InsertBillPayment>) => {
      const response = await apiRequest("PUT", `/api/bills/payments/${paymentId}`, updateData);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      const billId = variables.billId;
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/bills", billId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills", billId, "balance"] });
      
      // Invalidate bill-related queries to update bill status
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/carryover"], exact: false });
    },
  });
}