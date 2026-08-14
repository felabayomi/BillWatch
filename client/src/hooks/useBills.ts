import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Bill, InsertBill, UpdateBill } from "@shared/schema";

export function useBills(selectedDate?: Date) {
  const month = selectedDate ? selectedDate.getMonth() + 1 : undefined;
  const year = selectedDate ? selectedDate.getFullYear() : undefined;
  
  return useQuery<Bill[]>({
    queryKey: ["/api/bills", { month, year }],
    queryFn: async () => {
      let url = "/api/bills";
      if (month && year) {
        url += `?month=${month}&year=${year}`;
      }
      
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
  });
}

export function useBillStats(selectedDate?: Date) {
  const month = selectedDate ? selectedDate.getMonth() + 1 : undefined;
  const year = selectedDate ? selectedDate.getFullYear() : undefined;
  
  return useQuery<{
    thisMonth: number;
    upcoming: number;
    upcomingCount: number;
    overdue: number;
    paid: number;
    total: number;
    paidThisMonth: number;
    remainingThisMonth: number;
    nextDueDate: string | null;
    nextDueBill: string | null;
    // Cumulative totals through selected month
    cumulativeTotal: number;
    cumulativePaid: number;
    cumulativeUnpaid: number;
    // True all-time totals (never change)
    allTimeTotal: number;
    allTimePaid: number;
    allTimeUnpaid: number;
  }>({
    queryKey: ["/api/bills/stats", { month, year }],
    queryFn: async () => {
      let url = "/api/bills/stats";
      if (month && year) {
        url += `?month=${month}&year=${year}`;
      }
      
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
  });
}

export function useCarryoverBills(selectedDate?: Date) {
  const month = selectedDate ? selectedDate.getMonth() + 1 : undefined;
  const year = selectedDate ? selectedDate.getFullYear() : undefined;
  
  return useQuery<Bill[]>({
    queryKey: ["/api/bills/carryover", { month, year }],
    queryFn: async () => {
      if (!month || !year) return [];
      
      const response = await fetch(`/api/bills/carryover?month=${month}&year=${year}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
  });
}

export function useBillsByStatus(status: Bill["status"]) {
  return useQuery<Bill[]>({
    queryKey: ["/api/bills/filter", status],
    queryFn: async () => {
      const response = await fetch(`/api/bills/filter/${status}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bill: InsertBill) => {
      const response = await apiRequest("POST", "/api/bills", bill);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/carryover"], exact: false });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...bill }: UpdateBill & { id: string }) => {
      const response = await apiRequest("PUT", `/api/bills/${id}`, bill);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/carryover"], exact: false });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (billId: string) => {
      const response = await apiRequest("DELETE", `/api/bills/${billId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/carryover"], exact: false });
    },
  });
}

export function useDuplicateBill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (billId: string) => {
      const response = await apiRequest("POST", `/api/bills/${billId}/duplicate`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/bills"
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/bills/stats"
      });
    },
  });
}
