import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface CategoryAggregation {
  category: string;
  totalAmount: number;
  billCount: number;
  averageAmount: number;
  lastPaymentDate: Date | null;
}

export interface CategoryStats {
  categories: CategoryAggregation[];
  totalSpending: number;
  mostExpensiveCategory: string;
  mostFrequentCategory: string;
  uncategorizedAmount: number;
}

export function useCategoryStats(userId: string, includeArchived: boolean = false) {
  return useQuery({
    queryKey: ['category-stats', userId, includeArchived],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/categories/stats/${userId}?includeArchived=${includeArchived}`);
      return res.json() as Promise<CategoryStats>;
    },
    enabled: !!userId,
  });
}

export function usePredefinedCategories() {
  return useQuery({
    queryKey: ['predefined-categories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/categories/predefined');
      return res.json() as Promise<string[]>;
    },
  });
}

export function useUpdateBillCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ billId, category }: { billId: string; category: string }) => {
      const res = await apiRequest('PUT', `/api/bills/${billId}/category`, { category });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
    },
  });
}

export function useBillsByCategory(userId: string, category: string, includeArchived: boolean = false) {
  return useQuery({
    queryKey: ['category-bills', userId, category, includeArchived],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/categories/${encodeURIComponent(category)}/bills/${userId}?includeArchived=${includeArchived}`);
      return res.json();
    },
    enabled: !!userId && !!category,
  });
}

export function useCategoryTrends(userId: string, months: number = 6) {
  return useQuery({
    queryKey: ['category-trends', userId, months],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/categories/trends/${userId}?months=${months}`);
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useRecategorizationPreview(userId: string) {
  return useQuery({
    queryKey: ['recategorization-preview', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/recategorize/preview/${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useCustomCategories(userId: string) {
  return useQuery({
    queryKey: ['custom-categories', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/custom-categories/${userId}`);
      return res.json() as Promise<string[]>;
    },
    enabled: !!userId,
  });
}

export function useAddCustomCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, category }: { userId: string; category: string }) => {
      const res = await apiRequest('POST', `/api/custom-categories/${userId}`, { category });
      return res.json() as Promise<string[]>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
    },
  });
}

export function useDeleteCustomCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, category }: { userId: string; category: string }) => {
      const res = await apiRequest('DELETE', `/api/custom-categories/${userId}/${encodeURIComponent(category)}`);
      return res.json() as Promise<string[]>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
    },
  });
}

export function useRecategorizeExistingBills() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/recategorize/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recategorization-preview'] });
    },
  });
}